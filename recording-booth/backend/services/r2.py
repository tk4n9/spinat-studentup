import asyncio
import logging
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from config import (
    R2,
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    QR_EXPIRY_DAYS,
)

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
    return _client


def is_configured() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY)


_CONTENT_TYPES = {".mp4": "video/mp4", ".webm": "video/webm"}


def _content_type_for(file_path: Path) -> str:
    return _CONTENT_TYPES.get(file_path.suffix.lower(), "application/octet-stream")


def _sync_upload(file_path: Path, key: str) -> None:
    """Blocking upload — run via asyncio.to_thread to avoid blocking the event loop."""
    client = _get_client()
    with open(file_path, "rb") as f:
        client.put_object(
            Bucket=R2.bucket,
            Key=key,
            Body=f,
            ContentType=_content_type_for(file_path),
        )


async def upload_video(file_path: Path, video_id: str) -> str:
    """
    Upload video to R2. Returns the public download URL.
    Raises RuntimeError if R2 is not configured.
    """
    if not is_configured():
        raise RuntimeError("R2 credentials not configured. Set R2_* environment variables in .env")

    # key_prefix is per-booth (e.g. "videos/booth-1/") — set in YAML, not code.
    key = f"{R2.key_prefix}{video_id}{file_path.suffix}"

    try:
        await asyncio.to_thread(_sync_upload, file_path, key)
        logger.info(f"Uploaded {file_path.name} to R2 as {key}")
    except ClientError as e:
        logger.error(f"R2 upload failed for {video_id}: {e}")
        raise

    # Prefer public URL (stable, no expiry)
    if R2.public_url:
        return f"{R2.public_url.rstrip('/')}/{key}"

    # Fallback: presigned URL (expires after QR_EXPIRY_DAYS)
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": R2.bucket, "Key": key},
        ExpiresIn=QR_EXPIRY_DAYS * 86400,
    )
