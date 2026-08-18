from fastapi import APIRouter, Depends, Response, File, UploadFile
from sqlalchemy.orm import Session

from utils.export import records_to_csv, records_to_pdf
from database import get_db
from models.models import User, Pet, HealthRecord, RecordPhoto
from schemas.record import RecordCreate, RecordUpdate, RecordResponse, RecordPhotoResponse, GalleryPhoto
from utils.security import get_current_user
from utils.exceptions import BadRequestException, NotFoundException
from utils.photos import save_photo, delete_photo_file


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
    owner_pet_id = record.pet_id
    db.delete(record)
    db.commit()
    return Response(status_code=204)

@router.get("/pets/{pet_id}/export")
def export_records(pet_id: int, format: str = "csv", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Download a pet's records as CSV or PDF."""
    # Validate the requested format
    pet = _get_owned_pet(pet_id, db, current_user)
    records = db.query(HealthRecord).filter(HealthRecord.pet_id == pet.id).all()

    safe_name = "".join(c for c in pet.name if c.isalnum() or c in "-_") or "pet"

    if format == "csv":
        return Response(content=records_to_csv(pet, records).encode("utf-8-sig"),
                        media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{safe_name}-records.csv"'})
    elif format == "pdf":
        return Response(content=records_to_pdf(pet, records),
                        media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{safe_name}-records.pdf"'})
    else:
        raise BadRequestException("Unsupported format.")

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


@router.delete("/photos/{photo_id}", status_code=204)
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
        .order_by(RecordPhoto.created_at.desc())
    )
    rows = query.all()
    return [
        GalleryPhoto(
            id=p.id,
            record_id=r.id,
            filename=p.filename,
            record_title=r.title,
            record_date=r.date
        )
        for p, r in rows
    ]