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

Performance budget: hardware H.264 encoding via `h264_videotoolbox`
finishes a 20s 720p clip in ~0.5-1s on Apple Silicon. A 120s asyncio
timeout gives headroom for concurrent-booth contention at the venue
without letting a genuinely stuck ffmpeg hang finalize forever.
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
# Tuned 2026-04-24 evening (rehearsal → show 1 postmortem): 4 booths
# finalizing concurrently saturated the venue M-series CPU with
# libx264 (software encoder), stretching finalize to 5-7s per clip
# and creating visible "처리 중" queuing. Switched to Apple Silicon's
# dedicated media engine via `h264_videotoolbox`:
#   -c:v h264_videotoolbox : hardware encode, ~5-10× faster than
#                            libx264 preset=fast at 720p, and runs on
#                            the media engine so all 4 concurrent
#                            booths can finalize without CPU contention.
#   -b:v 1M                : fixed 1 Mbps. VideoToolbox does not support
#                            `-crf`; bitrate control is our knob. Real
#                            20s clips from the booth land around 2.8 MB
#                            at 1M (VBR overshoots the target for
#                            high-motion content — this is the encoder
#                            being honest about entropy, not a bug).
#                            Size/quality ladder measured 2026-04-24:
#                              5M target → ~5-6 MB actual
#                              2M target → ~5 MB actual (overshoot)
#                              1M target → ~2.8 MB actual  ← current
#                            Operator A/B'd 2M / 1.5M / 1M on the big
#                            monitor and accepted 1M; selfie-style
#                            footage holds up at 720p/1M even projected
#                            large, and the size win is substantial for
#                            cellular QR downloads.
#   -c:a aac / -b:a 128k   : unchanged — audio is cheap and the venue's
#                            webm/opus source must be re-encoded to AAC
#                            for MP4 compatibility regardless.
# Resolution is not scaled — 720p preserved for the big monitor.
_TRANSCODE_ARGS = [
    "-c:v", "h264_videotoolbox",
    "-b:v", "1M",
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

# Safety cap. VideoToolbox encodes a 20s 720p clip in ~0.5-1s; the
# dominant delay here is the subprocess + fs roundtrip, not encoding.
# Bumped 60 → 120 after the 2026-04-24 show observed concurrent-booth
# finalize stretching past 30s when 4 uvicorn workers shared the media
# engine and network at once. 120s is still a hard stop for a genuinely
# stuck ffmpeg, just with enough headroom that legitimate burst load
# never trips it.
_TIMEOUT_SECONDS = 120.0


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
