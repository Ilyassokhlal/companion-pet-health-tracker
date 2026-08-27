from datetime import datetime, date as date_type
from pydantic import BaseModel, Field, ConfigDict
from models.models import RecordType

# Schemas for the health record endpoints
class RecordCreate(BaseModel):
    """Schema for creating a new health record"""
    record_type: RecordType = Field(
        description="The type of the health record.",
        examples=["Medication"])
    title: str = Field(
        max_length=100,
        description="The title of the health record.",
        examples=["Rabies Vaccination"])
    description: str | None = Field(
        default=None, max_length=1000,
        description="A brief description of the health record.",
        examples=["Rabies vaccination administered on 2023-12-31."])
    date: date_type = Field(
        description="The date of the health record.",
        examples=["2023-12-31"])
    next_due_date: date_type | None = Field(
        default=None,
        description="The next due date for the health record, if applicable.",
        examples=["2024-12-31"])
    weight_kg: float | None = Field(
        default=None, gt=0,
        description="The pet's weight in kilograms. Only meaningful on Weight records; storage is always metric regardless of the user's unit setting.",
        examples=[27.2])


class RecordUpdate(BaseModel):
    """Schema for updating a health record"""
    record_type: RecordType | None = Field(
        default=None,
        description="The type of the health record.",
        examples=["Medication"])
    title: str | None = Field(
        default=None, max_length=100,
        description="The title of the health record.",
        examples=["Rabies Vaccination"])
    description: str | None = Field(
        default=None, max_length=1000,
        description="A brief description of the health record.",
        examples=["Rabies vaccination administered on 2023-12-31."])
    date: date_type | None = Field(
        default=None,
        description="The date of the health record.",
        examples=["2023-12-31"])
    next_due_date: date_type | None = Field(
        default=None,
        description="The next due date for the health record, if applicable.",
        examples=["2024-12-31"])
    weight_kg: float | None = Field(
        default=None, gt=0,
        description="The pet's weight in kilograms. Only meaningful on Weight records; storage is always metric regardless of the user's unit setting.",
        examples=[27.2])


class RecordResponse(BaseModel):
    """Schema for returning health record data"""
    id: int
    pet_id: int
    record_type: RecordType
    title: str
    description: str | None = None
    date: date_type
    next_due_date: date_type | None = None
    weight_kg: float | None = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes = True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "pet_id": 1,
                "record_type": "Medication",
                "title": "Rabies Vaccination",
                "description": "Rabies vaccination administered on 2023-12-31.",
                "date": "2023-12-31",
                "next_due_date": "2024-12-31",
                "weight_kg": None,
                "created_at": "2023-12-31T12:00:00"
            }
        }
    )

class RecordPhotoResponse(BaseModel):
    """One photo attached to a health record."""
    id: int
    record_id: int
    filename: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GalleryPhoto(BaseModel):
    """A photo plus the record it belongs to, for the Photos page."""
    id: int
    record_id: int
    filename: str
    record_title: str
    record_date: date_type