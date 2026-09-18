import contextlib
import io
import os
from uuid import uuid4

from config import settings
from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from utils.exceptions import BadRequestException

ALLOWED = {"image/jpeg", "image/png", "image/webp"}

# Every upload is stored as a JPEG no larger than MAX_EDGE on its long side, so a phone's full-resolution original
# does not cost every viewer its full weight. Grids load a second copy no larger than THUMB_EDGE.
MAX_EDGE = 2560
THUMB_EDGE = 400
JPEG_QUALITY = 85
THUMB_QUALITY = 80

# Pillow refuses anything over ~179 megapixels as a possible decompression bomb, which would reject a 200 MP phone
# photo. JPEGs are decoded at a reduced scale (draft) so their size is safe to allow; other formats decode in full and
# keep a tighter cap below.
Image.MAX_IMAGE_PIXELS = 250_000_000
MAX_FULL_DECODE_PIXELS = 60_000_000


def thumbnail_name(filename: str) -> str:
    """The grid-sized copy stored beside a photo."""
    return f"{os.path.splitext(filename)[0]}_thumb.jpg"


def read_upload(file: UploadFile) -> bytes:
    """Check an upload's type and weight and return its bytes. Nothing is written yet."""
    name = file.filename or ""
    if file.content_type not in ALLOWED:
        raise BadRequestException("Unsupported image type.", code="unsupported_image_type", name=name)
    data = file.file.read()
    if len(data) > settings.MAX_PHOTO_MB * 1024 * 1024:
        raise BadRequestException(
            f"{name} is larger than {settings.MAX_PHOTO_MB} MB.",
            code="image_too_large",
            name=name,
            max=settings.MAX_PHOTO_MB,
        )
    return data


def _upright_rgb(source: Image.Image) -> Image.Image:
    """Apply the camera's rotation flag and flatten any transparency onto white."""
    image = ImageOps.exif_transpose(source)
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        flat = Image.new("RGB", rgba.size, "white")
        flat.paste(rgba, mask=rgba.getchannel("A"))
        return flat
    return image.convert("RGB")


def _write_thumbnail(image: Image.Image, filename: str) -> None:
    thumb = image.copy()
    thumb.thumbnail((THUMB_EDGE, THUMB_EDGE))
    thumb.save(os.path.join(settings.PHOTO_DIR, thumbnail_name(filename)), "JPEG", quality=THUMB_QUALITY)


def store_photo(data: bytes, name: str = "") -> str:
    """Store an image upright, at most MAX_EDGE on its long side, plus its thumbnail. Returns the stored filename.

    Re-saving also drops the original's metadata, including any GPS location the camera wrote into it.
    """
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.format == "JPEG":
                source.draft("RGB", (MAX_EDGE, MAX_EDGE))
            elif source.width * source.height > MAX_FULL_DECODE_PIXELS:
                raise BadRequestException("Unsupported image type.", code="unsupported_image_type", name=name)
            image = _upright_rgb(source)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as e:
        raise BadRequestException("Unsupported image type.", code="unsupported_image_type", name=name) from e

    image.thumbnail((MAX_EDGE, MAX_EDGE))
    filename = f"{uuid4().hex}.jpg"
    image.save(os.path.join(settings.PHOTO_DIR, filename), "JPEG", quality=JPEG_QUALITY, optimize=True)
    _write_thumbnail(image, filename)
    return filename


def save_photo(file: UploadFile) -> str:
    """Validate and store one uploaded image, returning its generated filename."""
    return store_photo(read_upload(file), file.filename or "")


def delete_photo_file(filename: str | None) -> None:
    """Remove a stored photo and its thumbnail. Silent if the filename is empty or the files are already gone."""
    if not filename:
        return
    for name in (filename, thumbnail_name(filename)):
        with contextlib.suppress(FileNotFoundError):
            os.remove(os.path.join(settings.PHOTO_DIR, name))


def read_photo(filename: str) -> bytes | None:
    """Read a stored photo. None when the row points at a file that is no longer on disk."""
    try:
        with open(os.path.join(settings.PHOTO_DIR, filename), "rb") as f:
            return f.read()
    except FileNotFoundError:
        return None


def create_missing_thumbnails() -> int:
    """Give every stored photo that predates thumbnails a thumbnail. Returns how many were created.

    Run once after deploying: docker compose exec backend python -c "from utils.photos import create_missing_thumbnails as c; print(c())"
    """
    created = 0
    for name in sorted(os.listdir(settings.PHOTO_DIR)):
        stem, ext = os.path.splitext(name)
        if stem.endswith("_thumb") or ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        if os.path.exists(os.path.join(settings.PHOTO_DIR, thumbnail_name(name))):
            continue
        try:
            with Image.open(os.path.join(settings.PHOTO_DIR, name)) as source:
                if source.format == "JPEG":
                    source.draft("RGB", (THUMB_EDGE * 2, THUMB_EDGE * 2))
                image = _upright_rgb(source)
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
            continue
        _write_thumbnail(image, name)
        created += 1
    return created
