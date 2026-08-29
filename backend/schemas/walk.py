from datetime import date as date_type, datetime
from pydantic import BaseModel, Field, ConfigDict


# Schemas for the walk endpoints
class WalkCreate(BaseModel):
    """Schema for logging a walk."""
    date: date_type = Field(
        description="The day the walk happened.",
        examples=["2026-08-28"])
    duration_minutes: int = Field(
        gt=0,
        le=1440,
        description="How long the walk lasted, in minutes.",
        examples=[45])
    distance_km: float | None = Field(
        default=None,
        ge=0,
        description="How far the walk covered, in kilometres. Optional - not every walk is measured.",
        examples=[3.2])
    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Anything worth remembering about the walk.",
        examples=["Limped slightly on the way back."])


class WalkUpdate(BaseModel):
    """Schema for editing a logged walk. Every field is optional."""
    date: date_type | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    distance_km: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class WalkResponse(BaseModel):
    """Schema for returning a logged walk."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    date: date_type
    duration_minutes: int
    distance_km: float | None
    notes: str | None
    created_at: datetime