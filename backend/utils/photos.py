import os
from uuid import uuid4

from fastapi import UploadFile

from config import settings
from utils.exceptions import BadRequestException

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def save_photo(file: UploadFile) -> str:
    """Validate and store an uploaded image, returning its generated filename."""
    if file.content_type not in ALLOWED:
        raise BadRequestException("Unsupported image type.", code="unsupported_image_type")
    data = file.file.read()
    if len(data) > settings.MAX_PHOTO_MB * 1024 * 1024:
        raise BadRequestException("Image too large.", code="image_too_large")
    name = f"{uuid4().hex}{ALLOWED[file.content_type]}"
    with open(os.path.join(settings.PHOTO_DIR, name), "wb") as f:
        f.write(data)
    return name


def delete_photo_file(filename: str | None) -> None:
    """Remove a stored photo. Silent if the filename is empty or the file is already gone."""
    if not filename:
        return
    try:
        os.remove(os.path.join(settings.PHOTO_DIR, filename))
    except FileNotFoundError:
        pass


def read_photo(filename: str) -> bytes | None:
    """Read a stored photo. None when the row points at a file that is no longer on disk."""
    try:
        with open(os.path.join(settings.PHOTO_DIR, filename), "rb") as f:
            return f.read()
    except FileNotFoundError:
        return None