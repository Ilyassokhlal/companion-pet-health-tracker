from datetime import date as date_type, datetime, time as time_type
from pydantic import BaseModel, Field, ConfigDict, field_validator

AMOUNT_UNITS = ("g", "kg", "ml", "l", "cup", "oz")


class FeedingTimeCreate(BaseModel):
    """Create a new feeding time for a pet."""
    time: time_type = Field(description="Time of day, on a 15-minute boundary.", examples=["08:15"])

    @field_validator("time")
    @classmethod
    def _quarter_hour(cls, value: time_type) -> time_type:
        if value.minute % 15 or value.second or value.microsecond:
            raise ValueError("Feeding times must be on a 15-minute boundary.")
        return value


class FeedingTimeResponse(BaseModel):
    """Response model for a feeding time."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    time: time_type


class FeedingCreate(BaseModel):
    """Create a new feeding record for a pet."""
    date: date_type
    time: time_type
    food: str | None = Field(default=None, max_length=100)
    amount: float | None = Field(default=None, ge=0)
    amount_unit: str | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("amount_unit")
    @classmethod
    def _known_unit(cls, value: str | None) -> str | None:
        if value is not None and value not in AMOUNT_UNITS:
            raise ValueError(f"Unit must be one of {', '.join(AMOUNT_UNITS)}.")
        return value


class FeedingUpdate(BaseModel):
    """Update an existing feeding record for a pet."""
    date: date_type | None = None
    time: time_type | None = None
    food: str | None = Field(default=None, max_length=100)
    amount: float | None = Field(default=None, ge=0)
    amount_unit: str | None = None
    notes: str | None = Field(default=None, max_length=1000)


class FeedingResponse(BaseModel):
    """Response model for a feeding record."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    date: date_type
    time: time_type
    food: str | None
    amount: float | None
    amount_unit: str | None
    notes: str | None
    created_at: datetime


class SlotStatus(BaseModel):
    """Status of a single feeding slot for today."""
    time: time_type
    status: str