import uuid
import shutil
from pathlib import Path
import aiofiles
from fastapi import UploadFile
from config import PATHS


async def save_upload(file: UploadFile) -> tuple[str, Path]:
    """Save uploaded video to temp storage. Returns (video_id, temp_path)."""
    video_id = str(uuid.uuid4())
    # Preserve extension; default to .webm
    suffix = Path(file.filename).suffix if (file.filename and Path(file.filename).suffix) else ".webm"
    temp_path = PATHS.temp / f"{video_id}{suffix}"

    async with aiofiles.open(temp_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            await out.write(chunk)

    return video_id, temp_path


def move_to_display(temp_path: Path) -> Path:
    """Move video from temp → display folder. Returns new path."""
    dest = PATHS.display / temp_path.name
    shutil.move(str(temp_path), str(dest))
    return dest


def copy_to_instagram(source_path: Path) -> Path:
    """Copy video to instagram folder. Returns dest path."""
    dest = PATHS.instagram / source_path.name
    shutil.copy2(str(source_path), str(dest))
    return dest


def delete_temp(temp_path: Path) -> None:
    if temp_path.exists():
        temp_path.unlink()


def get_display_videos() -> list[dict]:
    """Return all display videos sorted by creation time (oldest first)."""
    files = sorted(
        [p for p in PATHS.display.iterdir() if p.is_file() and not p.name.startswith(".")],
        key=lambda p: p.stat().st_ctime,
    )
    return [
        {"id": p.stem, "filename": p.name, "url": f"/videos/display/{p.name}"}
        for p in files
    ]
