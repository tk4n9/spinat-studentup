import asyncio
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from services import storage, r2, qr_gen, transcode
from routers.ws import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/videos", tags=["videos"])

# video_id → Path (temp or display)
_registry: dict[str, Path] = {}
# video_id → R2 download URL (populated after finalize)
_r2_urls: dict[str, str] = {}


@router.post("/upload")
async def upload_video(
    video_file: UploadFile = File(...),
    format_id: int = Form(default=1),
):
    video_id, temp_path = await storage.save_upload(video_file)
    _registry[video_id] = temp_path
    logger.info(f"Uploaded {video_id} ({video_file.size} bytes)")
    return {"id": video_id, "format_id": format_id}


@router.post("/{video_id}/finalize")
async def finalize_video(
    video_id: str,
    save: bool = Form(default=False),
    instagram: bool = Form(default=False),
):
    path = _registry.get(video_id)
    if not path or not path.exists():
        raise HTTPException(404, "Video not found or already finalized")

    r2_url: str | None = None

    # ── Neither checkbox: discard and go back to start ──────────────
    if not save and not instagram:
        storage.delete_temp(path)
        _registry.pop(video_id, None)
        return {"id": video_id, "r2_url": None}

    # ── Normalize to faststart MP4 (Bug B+C fix) ────────────────────
    # WebKit MediaRecorder produces WebM with the Cues element at file
    # end, which stalls HTTP streaming in browsers. Transcode EVERY
    # recording to H.264/AAC MP4 with +faststart before any downstream
    # consumer (monitor <video>, instagram folder, R2 upload) sees it.
    try:
        path = await transcode.transcode_to_faststart_mp4(path)
        _registry[video_id] = path
    except Exception as exc:
        logger.error(f"Transcode failed for {video_id}: {exc}")
        raise HTTPException(500, f"Transcode failed: {exc}")

    # ── Move to display folder (local copy for monitor) ─────────────
    if save:
        display_path = storage.move_to_display(path)
        _registry[video_id] = display_path

        # Upload to R2 (non-blocking, best-effort)
        if r2.is_configured():
            try:
                r2_url = await asyncio.wait_for(
                    r2.upload_video(display_path, video_id),
                    timeout=30.0,
                )
                _r2_urls[video_id] = r2_url
                logger.info(f"R2 upload OK: {r2_url}")
            except Exception as exc:
                logger.warning(f"R2 upload failed for {video_id}: {exc}")
                r2_url = None
        else:
            logger.warning("R2 not configured — QR code will not be available")

        # Notify monitor
        await manager.broadcast({
            "type": "new_video",
            "id": video_id,
            "filename": display_path.name,
            "url": f"/videos/display/{display_path.name}",
        })

    # ── Copy to instagram folder ────────────────────────────────────
    if instagram:
        source = _registry.get(video_id, path)
        storage.copy_to_instagram(source)
        logger.info(f"Copied {video_id} to instagram folder")

    # ── If only instagram (no save): clean up temp ──────────────────
    if not save:
        storage.delete_temp(path)
        _registry.pop(video_id, None)

    return {"id": video_id, "r2_url": r2_url}


@router.get("/display")
def list_display():
    return storage.get_display_videos()


@router.get("/{video_id}/qr.png")
def get_qr(video_id: str):
    """Generate and return a QR code PNG for this video's R2 download URL."""
    url = _r2_urls.get(video_id)
    if not url:
        raise HTTPException(404, "No download URL for this video (R2 not configured or upload failed)")
    png = qr_gen.generate_qr_bytes(url)
    return Response(content=png, media_type="image/png")
