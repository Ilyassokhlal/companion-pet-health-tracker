from datetime import date, datetime

from database import get_db
from fastapi import APIRouter, Depends
from models.models import EventKind, HealthRecord, Pet, RecordType, ScheduledEvent, User
from schemas.event import EventCreateRequest, EventResponse, EventUpdateRequest
from schemas.record import RecordResponse
from sqlalchemy.orm import Session, joinedload
from utils.exceptions import BadRequestException, NotFoundException
from utils.security import get_current_user
from utils.weight import is_tracked, next_checkin_date

router = APIRouter(tags=["Scheduled Events"])


def _get_owned_event(event_id: int, db: Session, current_user: User) -> ScheduledEvent:
    """Get a scheduled event owned by the current user. Raises NotFoundException if not found."""
    event = db.query(ScheduledEvent).join(Pet).filter(ScheduledEvent.id == event_id, Pet.user_id == current_user.id).first()
    if not event:
        raise NotFoundException("Event", event_id)
    return event

def _get_owned_pet(pet_id: int, db: Session, current_user: User) -> Pet:
    """Get a pet owned by the current user. Raises NotFoundException if not found."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


@router.get("/pets/{pet_id}/events", response_model=list[EventResponse])
def list_events(pet_id: int, include_done: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Scheduled events for a pet, soonest first."""
    pet = _get_owned_pet(pet_id, db, current_user)
    query = (
        db.query(ScheduledEvent)
        .options(joinedload(ScheduledEvent.source_record))
        .filter(ScheduledEvent.pet_id == pet.id)
    )
    if not include_done:
        query = query.filter(ScheduledEvent.completed_at.is_(None))
    return query.order_by(ScheduledEvent.due_date).all()


@router.post("/events", response_model=EventResponse, status_code=201)
def create_event(request: EventCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Schedule something with no health record behind it."""
    pet = _get_owned_pet(request.pet_id, db, current_user)
    event = ScheduledEvent(
        pet_id=pet.id,
        title=request.title,
        due_date=request.due_date,
        kind=request.kind,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/events/{event_id}", response_model=EventResponse)
def update_event(event_id: int, request: EventUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a scheduled event's title or due date."""
    event = _get_owned_event(event_id, db, current_user)
    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a scheduled event."""
    event = _get_owned_event(event_id, db, current_user)
    db.delete(event)
    db.commit()


# Maps an event kind to the record type its completion should create.
_DEFAULT_RECORD_TYPE = {
    EventKind.APPOINTMENT: RecordType.VET_VISIT,
    EventKind.WEIGHT_CHECKIN: RecordType.WEIGHT,
}


@router.post("/events/{event_id}/complete", response_model=RecordResponse, status_code=201)
def complete_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark done, create the health record it produced, and return that record for editing."""
    event = _get_owned_event(event_id, db, current_user)
    if event.completed_at is not None:
        raise BadRequestException(code="event_already_completed")
    if event.kind == EventKind.RECORD_FOLLOWUP and event.source_record:
        record_type = event.source_record.record_type
    else:
        record_type = _DEFAULT_RECORD_TYPE.get(event.kind, RecordType.VET_VISIT)
    record = HealthRecord(
        pet_id=event.pet_id,
        record_type=record_type,
        title=event.title,
        date=date.today()
    )
    db.add(record)
    event.completed_at = datetime.now()
    db.flush()
    event.result_record_id = record.id
    if event.kind == EventKind.WEIGHT_CHECKIN and is_tracked(event.pet):
        db.add(ScheduledEvent(
            pet_id=event.pet_id,
            title=event.title,
            kind=EventKind.WEIGHT_CHECKIN,
            due_date=next_checkin_date(event.due_date, event.pet.weight_frequency, date.today()),
        ))
    db.commit()
    db.refresh(record)
    return record