"""File upload validation and storage helpers."""
import os
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.core.config import get_settings

settings = get_settings()


def validate_filename(filename: str) -> bool:
    """Ensure filename is safe."""
    basename = os.path.basename(filename)
    return basename == filename


def validate_extension(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in settings.allowed_extensions


async def save_upload(upload: UploadFile, order_id=None) -> dict:
    """Validate and save an uploaded file securely. Returns file metadata."""
    original_name = upload.filename or "upload"

    if not validate_filename(original_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    if not validate_extension(original_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(settings.allowed_extensions)}",
        )

    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    subdir = str(uuid.uuid4().hex[:2])
    upload_dir = Path(settings.upload_dir) / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / stored_name

    size = 0
    with open(dest, "wb") as out:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_size_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds max size of {settings.max_upload_size_mb}MB",
                )
            out.write(chunk)

    return {
        "original_name": original_name,
        "stored_name": stored_name,
        "mime_type": upload.content_type or "application/octet-stream",
        "file_size": size,
        "file_path": str(dest),
        "stored_relative": f"{subdir}/{stored_name}",
    }
