"""
Video normalization for network-streamable playback.

Root problem (Bug B + Bug C, STATUSLOG 2026-04-22):
  - iPad Safari (WebKit 17+) MediaRecorder outputs WebM with the Cues
    (seek index) element written at the END of the file. Without a
    SeekHead pointing to it, `<video>` in browsers stalls when fed via
    HTTP — thumbnail renders but play button does nothing.
  - Android Chrome produces WebM similarly; some iPad flows produce
    non-faststart MP4 where the `moov` atom is at file end.

Fix: run every finalized recording through ffmpeg to produce a single
canonical output format — H.264 + AAC MP4 with `+faststart` — so the
`moov` atom sits at the front of the file and browsers can begin
streaming before the download completes.

Performance budget: measured 3.4s wall-clock on M1 for a 30s 720p WebM
using `-preset veryfast -crf 23`. A 60s asyncio timeout gives headroom
for the weaker venue MacBook + occasional bursts.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ffmpeg's `-movflags +faststart` rewrites the MP4 so the `moov` atom
# (index) is at the start, enabling progressive HTTP playback.
_FASTSTART_FLAG = "+faststart"

# Full transcode args — used when input is WebM (or any format that
# needs codec conversion).
#
# Tuned 2026-04-24 after observing 5-6 MB per 20-second clip on the
# venue pipeline — too heavy for QR-triggered phone downloads over
# cellular. New preset targets ~2-2.7 MB at still-acceptable visual
# quality for the monitor showcase:
#   -preset fast   : ~10% smaller than veryfast at same CRF, ~30% more
#                    CPU — still well under the 60s timeout.
#   -crf 28        : ~45% smaller than CRF 23. Slight softening, not
#                    noticeable on a phone screen during reel playback.
#   -r 30          : caps at 30fps. iPhone back cameras default to 30
#                    anyway; this only kicks in if a device recorded at
#                    60fps, in which case dropping half the frames saves
#                    ~30-40% with no perceptible motion loss for the
#                    stationary selfie-style shots we capture.
# Resolution is NOT scaled — 720p is kept so the big monitor stays
# crisp. Size savings come from codec tuning, not pixel count.
_TRANSCODE_ARGS = [
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "28",
    "-r", "30",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", _FASTSTART_FLAG,
    "-y",  # overwrite existing dst (idempotent re-runs)
]

# Stream-copy remux — used when input is already MP4 but may have the
# `moov` atom at the wrong position. 10x faster than re-encoding.
_REMUX_ARGS = [
    "-c", "copy",
    "-movflags", _FASTSTART_FLAG,
    "-y",
]

# Compact encode args — used for the R2 upload variant only. The
# monitor/display file keeps full 720p via _TRANSCODE_ARGS; this second
# pass produces a phone-friendly ~1.5-2 MB version for QR-code download:
#   - scale=-2:540  : 720p → 540p (short-edge 540, preserve aspect,
#                     -2 = round to even width for libx264 compatibility).
#   - crf 30        : more aggressive than the display's crf 28.
#   - audio 96k     : 128k → 96k. Borderline perceptible on headphones,
#                     fine on phone speakers.
# Input is the already-transcoded display MP4, so we re-encode from
# H.264 (not WebM) — slightly cheaper than a fresh WebM decode.
_COMPACT_ARGS = [
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "30",
    "-r", "30",
    "-vf", "scale=-2:540",
    "-c:a", "aac",
    "-b:a", "96k",
    "-movflags", _FASTSTART_FLAG,
    "-y",
]

# Safety cap. A 30s clip transcodes in ~3.4s on M1; 60s leaves plenty
# of headroom for the venue laptop without letting a runaway ffmpeg
# stall the finalize request indefinitely.
_TIMEOUT_SECONDS = 60.0


async def transcode_to_faststart_mp4(src: Path) -> Path:
    """
    Produce a browser-streamable `.mp4` with `moov` at the front.

    Side effects:
      - Writes `{src.parent}/{src.stem}.mp4`.
      - Deletes `src` IFF the original file path differs from the output
        path (i.e. input was not already `.mp4` in-place). Callers must
        treat `src` as consumed after this function returns.

    Raises:
      RuntimeError on ffmpeg failure (non-zero exit, timeout, or if
      ffmpeg is not installed on PATH).
    """
    dst = src.parent / f"{src.stem}.mp4"
    is_inplace = (src.resolve() == dst.resolve())

    if is_inplace:
        # MP4 in, MP4 out: go through a sibling temp path because
        # ffmpeg cannot read-and-write the same file simultaneously.
        tmp_dst = src.parent / f"{src.stem}.faststart.mp4"
        args = ["ffmpeg", "-i", str(src), *_REMUX_ARGS, str(tmp_dst)]
    elif src.suffix.lower() == ".mp4":
        # Different directory or filename → direct remux is fine.
        args = ["ffmpeg", "-i", str(src), *_REMUX_ARGS, str(dst)]
        tmp_dst = None
    else:
        # WebM / any non-MP4 → full transcode.
        args = ["ffmpeg", "-i", str(src), *_TRANSCODE_ARGS, str(dst)]
        tmp_dst = None

    logger.info(f"[transcode] starting: {src.name} → {dst.name}")

    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError(
                f"ffmpeg timed out after {_TIMEOUT_SECONDS}s on {src.name}"
            )
    except FileNotFoundError as exc:
        # ffmpeg binary missing on PATH.
        raise RuntimeError("ffmpeg not found on PATH — install via `brew install ffmpeg`") from exc

    if proc.returncode != 0:
        tail = (stderr.decode("utf-8", errors="replace") if stderr else "")[-800:]
        raise RuntimeError(
            f"ffmpeg exit {proc.returncode} on {src.name}: {tail}"
        )

    if is_inplace and tmp_dst is not None:
        # Atomic-ish swap: replace the original with the remuxed copy.
        tmp_dst.replace(dst)
    elif src.exists() and src.resolve() != dst.resolve():
        # Reclaim disk — the source is now redundant.
        try:
            src.unlink()
        except OSError as exc:
            logger.warning(f"[transcode] failed to delete source {src}: {exc}")

    logger.info(f"[transcode] done: {dst.name}")
    return dst


async def transcode_to_compact_mp4(src: Path) -> Path:
    """
    Produce a downsized sibling MP4 for R2 upload / QR-download.

    Unlike transcode_to_faststart_mp4, this function does NOT delete the
    source — the caller (finalize route) needs the high-quality original
    to stay put for the monitor and the instagram copy. The compact
    output sits at `{src.parent}/{src.stem}.compact.mp4` and is the
    caller's responsibility to unlink once it has been uploaded.

    Raises:
      RuntimeError on ffmpeg failure (non-zero exit, timeout, or if
      ffmpeg is not installed on PATH).
    """
    dst = src.parent / f"{src.stem}.compact.mp4"
    args = ["ffmpeg", "-i", str(src), *_COMPACT_ARGS, str(dst)]

    logger.info(f"[transcode] compact: {src.name} → {dst.name}")

    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError(
                f"ffmpeg compact timed out after {_TIMEOUT_SECONDS}s on {src.name}"
            )
    except FileNotFoundError as exc:
        raise RuntimeError("ffmpeg not found on PATH — install via `brew install ffmpeg`") from exc

    if proc.returncode != 0:
        tail = (stderr.decode("utf-8", errors="replace") if stderr else "")[-800:]
        raise RuntimeError(
            f"ffmpeg compact exit {proc.returncode} on {src.name}: {tail}"
        )

    logger.info(f"[transcode] compact done: {dst.name}")
    return dst
