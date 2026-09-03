from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from zoneinfo import ZoneInfo

from database import get_db
from fastapi import APIRouter, Depends, Response
from models.models import Feeding, FeedingTime, Pet, User
from schemas.feeding import (
    FeedingCreate,
    FeedingResponse,
    FeedingTimeCreate,
    FeedingTimeResponse,
    FeedingUpdate,
    SlotStatus,
)
from sqlalchemy.orm import Session
from utils.exceptions import DuplicateException, NotFoundException
from utils.feeding import pet_slots, satisfied_slots, slot_status, to_minutes
from utils.security import get_current_user

router = APIRouter(tags=["Feeding"])


def _get_owned_pet(pet_id: int, db: Session, current_user: User) -> Pet:
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


def _get_owned_feeding(feeding_id: int, db: Session, current_user: User) -> Feeding:
    row = db.query(Feeding).join(Pet).filter(Feeding.id == feeding_id, Pet.user_id == current_user.id).first()
    if not row:
        raise NotFoundException("Feeding", feeding_id)
    return row


@router.get("/pets/{pet_id}/feeding-times", response_model=list[FeedingTimeResponse])
def list_feeding_times(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """A pet's schedule, earliest first."""
    pet = _get_owned_pet(pet_id, db, current_user)
    return db.query(FeedingTime).filter(FeedingTime.pet_id == pet.id).order_by(FeedingTime.time).all()


@router.post("/pets/{pet_id}/feeding-times", response_model=FeedingTimeResponse, status_code=201)
def create_feeding_time(
    pet_id: int,
    request: FeedingTimeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new feeding time for a pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    exists = (
        db.query(FeedingTime)
        .filter(FeedingTime.pet_id == pet.id, FeedingTime.time == request.time)
        .first()
    )
    if exists:
        raise DuplicateException("Feeding time", "time", str(request.time))
    row = FeedingTime(pet_id=pet.id, time=request.time)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/feeding-times/{feeding_time_id}", status_code=204)
def delete_feeding_time(
    feeding_time_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a feeding time for a pet."""
    row = (
        db.query(FeedingTime)
        .join(Pet)
        .filter(FeedingTime.id == feeding_time_id, Pet.user_id == current_user.id)
        .first()
    )
    if not row:
        raise NotFoundException("Feeding time", feeding_time_id)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.get("/pets/{pet_id}/feedings", response_model=list[FeedingResponse])
def list_feedings(
    pet_id: int,
    on: date_type | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List a pet's feeding records, newest first. Optionally filter by a specific day."""
    pet = _get_owned_pet(pet_id, db, current_user)
    query = db.query(Feeding).filter(Feeding.pet_id == pet.id)
    if on is not None:
        query = query.filter(Feeding.date == on)
    return query.order_by(Feeding.date.desc(), Feeding.time.desc()).all()


@router.post("/pets/{pet_id}/feedings", response_model=FeedingResponse, status_code=201)
def create_feeding(
    pet_id: int,
    request: FeedingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new feeding record for a pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    row = Feeding(pet_id=pet.id, **request.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/feedings/{feeding_id}", response_model=FeedingResponse)
def update_feeding(
    feeding_id: int,
    request: FeedingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_owned_feeding(feeding_id, db, current_user)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/feedings/{feeding_id}", status_code=204)
def delete_feeding(
    feeding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a feeding record for a pet."""
    row = _get_owned_feeding(feeding_id, db, current_user)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.get("/pets/{pet_id}/feeding-status", response_model=list[SlotStatus])
def feeding_status(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the feeding status for a pet's scheduled slots for today."""
    pet = _get_owned_pet(pet_id, db, current_user)
    slots = pet_slots(db, pet.id)
    if not slots:
        return []

    local = datetime.now(ZoneInfo(current_user.timezone or "UTC"))
    covered = satisfied_slots(db, pet.id, local.date(), slots)
    statuses = slot_status(slots, covered, to_minutes(local.time()))
    return [
        SlotStatus(time=time_type(hour=slot // 60, minute=slot % 60), status=statuses[slot])
        for slot in slots
    ]