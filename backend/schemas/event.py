from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from models.models import EventKind, RecordType


class EventCreateRequest(BaseModel):
    """Schedule something that has no health record behind it yet."""
    pet_id: int
    title: str = Field(min_length=1, max_length=100)
    due_date: date
    kind: EventKind = EventKind.APPOINTMENT


class EventUpdateRequest(BaseModel):
    """Request model for updating a scheduled event."""
    title: str | None = Field(default=None, min_length=1, max_length=100)
    due_date: date | None = None


class EventResponse(BaseModel):
    """A scheduled event as the clients see it."""
    id: int
    pet_id: int
    title: str
    kind: EventKind
    due_date: date
    completed_at: datetime | None = None
    source_record_id: int | None = None
    result_record_id: int | None = None
    record_type: RecordType | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)