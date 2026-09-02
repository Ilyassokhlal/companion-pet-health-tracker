import io
import os
import zipfile
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, File, UploadFile
from sqlalchemy.orm import Session

from utils.export import export_zip, records_to_pdf
from database import get_db
from models.models import User, Pet, HealthRecord, RecordPhoto, Walk, Feeding, FeedingTime, Expense
from schemas.record import RecordCreate, RecordUpdate, RecordResponse, RecordPhotoResponse, GalleryPhoto
from utils.security import get_current_user
from utils.exceptions import BadRequestException, NotFoundException
from utils.photos import save_photo, delete_photo_file, read_photo
from utils.scheduling import sync_followup_event
from utils.weight import sync_pet_weight


# Router setup
router = APIRouter(tags=["Health Records"])

# Helper function to get a pet owned by the current user more efficiently
def _get_owned_pet(pet_id: int, db: Session, current_user: User) -> Pet:
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet

# Health record endpoints
@router.get("/pets/{pet_id}/records", response_model=list[RecordResponse])
def list_records(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all health records for a specific pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    return db.query(HealthRecord).filter(HealthRecord.pet_id == pet.id).all()


@router.post("/pets/{pet_id}/records", response_model=RecordResponse, status_code=201)
def create_record(pet_id: int, request: RecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new health record for a specific pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    record = HealthRecord(pet_id=pet.id, **request.model_dump())
    db.add(record)
    db.flush()
    sync_followup_event(db, record)
    sync_pet_weight(db, record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/records/{record_id}", response_model=RecordResponse)
def update_record(record_id: int, request: RecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a specific health record by ID."""
    record = (
        db.query(HealthRecord)
        .join(Pet)
        .filter(HealthRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if not record:
        raise NotFoundException("Record", record_id)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    sync_followup_event(db, record)
    sync_pet_weight(db, record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=204)
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific health record by ID."""
    record = (
        db.query(HealthRecord)
        .join(Pet)
        .filter(HealthRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if not record:
        raise NotFoundException("Record", record_id)
    for photo in record.photos:
        delete_photo_file(photo.filename)
    db.delete(record)
    db.commit()
    return Response(status_code=204)

@router.get("/pets/{pet_id}/export")
def export_records(pet_id: int, format: str = "csv", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Download a pet's full data as a zip of CSVs, or its health record as a PDF."""
    pet = _get_owned_pet(pet_id, db, current_user)
    records = db.query(HealthRecord).filter(HealthRecord.pet_id == pet.id).all()

    safe_name = "".join(c for c in pet.name if c.isalnum() or c in "-_") or "pet"

    # "csv" stays as an alias for "zip" so an installed app that has not taken the OTA yet still gets a
    # working download instead of an error during the window between deploying the two.
    if format in ("zip", "csv"):
        walks = db.query(Walk).filter(Walk.pet_id == pet.id).all()
        feedings = db.query(Feeding).filter(Feeding.pet_id == pet.id).all()
        expenses = db.query(Expense).filter(Expense.pet_id == pet.id).all()
        return Response(content=export_zip(pet, records, walks, feedings, expenses), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{safe_name}-export.zip"'})
    elif format == "pdf":
        walks = db.query(Walk).filter(Walk.pet_id == pet.id).all()
        feeding_times = db.query(FeedingTime).filter(FeedingTime.pet_id == pet.id).all()
        return Response(content=records_to_pdf(pet, records, walks, feeding_times), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{safe_name}-records.pdf"'})
    else:
        raise BadRequestException("Unsupported format.", code="unsupported_export_format")

@router.post("/records/{record_id}/photos", response_model=list[RecordPhotoResponse], status_code=201)
def upload_record_photos(record_id: int, files: list[UploadFile] = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Attach one or more photos to a health record."""
    record = db.query(HealthRecord).join(Pet).filter(HealthRecord.id == record_id, Pet.user_id == current_user.id).first()
    if not record:
        raise NotFoundException("HealthRecord", record_id)

    photos = []
    for file in files:
        name = save_photo(file)
        photo = RecordPhoto(record_id=record.id, filename=name)
        photos.append(photo)
    db.add_all(photos)
    db.commit()
    for photo in photos:
        db.refresh(photo)
    return photos


@router.delete("/record-photos/{photo_id}", status_code=204)
def delete_record_photo(photo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove one photo from a record."""
    photo = (
        db.query(RecordPhoto)
        .join(HealthRecord)
        .join(Pet)
        .filter(RecordPhoto.id == photo_id, Pet.user_id == current_user.id)
        .first()
    )
    if not photo:
        raise NotFoundException("RecordPhoto", photo_id)

    delete_photo_file(photo.filename)
    db.delete(photo)
    db.commit()
    return Response(status_code=204)


@router.get("/pets/{pet_id}/photos", response_model=list[GalleryPhoto])
def list_pet_photos(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Every photo for a pet, newest first, with the record it belongs to."""
    pet = _get_owned_pet(pet_id, db, current_user)
    query = (
        db.query(RecordPhoto, HealthRecord)
        .join(HealthRecord)
        .filter(HealthRecord.pet_id == pet.id)
        .order_by(HealthRecord.date.desc(), RecordPhoto.created_at.desc())
    )
    rows = query.all()
    return [
        GalleryPhoto(
            id=p.id,
            record_id=r.id,
            filename=p.filename,
            record_title=r.title,
            record_date=r.date,
            record_type=r.record_type
        )
        for p, r in rows
    ]


# Maximum number of photos that can be downloaded at once.
MAX_PHOTO_DOWNLOAD = 10


@router.get("/pets/{pet_id}/photos/download")
def download_pet_photos(
    pet_id: int,
    ids: Annotated[list[int], Query()],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a selection of a pet's photos as a single zip."""
    unique = list(dict.fromkeys(ids))
    if not unique:
        raise BadRequestException("No photos selected.", code="no_photos_selected")
    if len(unique) > MAX_PHOTO_DOWNLOAD:
        raise BadRequestException(f"Select at most {MAX_PHOTO_DOWNLOAD} photos.", code="too_many_photos")

    pet = _get_owned_pet(pet_id, db, current_user)
    rows = (
        db.query(RecordPhoto, HealthRecord)
        .join(HealthRecord)
        .filter(HealthRecord.pet_id == pet.id, RecordPhoto.id.in_(unique))
        .order_by(HealthRecord.date.desc(), RecordPhoto.created_at.desc())
        .all()
    )

    # Check which requested photos were found and which are missing.
    found = {photo.id for photo, _ in rows}
    missing = [i for i in unique if i not in found]
    if missing:
        raise NotFoundException("Photo", missing[0])

    safe_name = "".join(c for c in pet.name if c.isalnum() or c in "-_") or "pet"
    buffer = io.BytesIO()
    written = 0

    # Create a zip archive in memory and add the selected photos to it.
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        for index, (photo, record) in enumerate(rows, start=1):
            data = read_photo(photo.filename)
            if data is None:
                continue
            safe_title = "".join(c for c in record.title if c.isalnum() or c in "-_ ").strip() or "record"
            extension = os.path.splitext(photo.filename)[1]
            archive.writestr(f"{record.date}-{safe_title}-{index}{extension}", data)
            written += 1

    # If no photos were successfully written to the archive, raise a 404 to indicate that the requested photos could not be found.
    if written == 0:
        raise NotFoundException("Photo", unique[0])

    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}-photos.zip"'},
    )