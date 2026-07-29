from fastapi import APIRouter, Depends, Response, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, Pet, HealthRecord
from schemas.record import RecordCreate, RecordUpdate, RecordResponse
from utils.security import get_current_user
from utils.activity import log_activity
from utils.exceptions import NotFoundException

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
def create_record(pet_id: int, request: RecordCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new health record for a specific pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    record = HealthRecord(pet_id=pet.id, **request.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    background_tasks.add_task(log_activity, current_user.id, "create_record", detail=f"record_id={record.id}", pet_id=pet.id)
    return record


@router.patch("/records/{record_id}", response_model=RecordResponse)
def update_record(record_id: int, request: RecordUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    background_tasks.add_task(log_activity, current_user.id, "update_record", detail=f"record_id={record.id}", pet_id=record.pet_id)
    return record


@router.delete("/records/{record_id}", status_code=204)
def delete_record(record_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific health record by ID."""
    record = (
        db.query(HealthRecord)
        .join(Pet)
        .filter(HealthRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if not record:
        raise NotFoundException("Record", record_id)
    owner_pet_id = record.pet_id
    db.delete(record)
    db.commit()
    background_tasks.add_task(log_activity, current_user.id, "delete_record", detail=f"record_id={record_id}", pet_id=owner_pet_id)
    return Response(status_code=204)

