from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

# Schemas for the pet endpoints
class PetCreate(BaseModel):
    """Schema for creating a new pet"""
    name: str = Field(
        max_length=50,
        description="The name of the pet.",
        examples=["Flash"])
    species: str = Field(
        max_length=50,
        description="The species of the pet.",
        examples=["Dog"])
    breed: str | None = Field(
        default=None, max_length=50,
        description="The breed of the pet.",
        examples=["Labrador Retriever"])
    birth_date: date | None = Field(
        default=None,
        description="The birth date of the pet.",
        examples=["2026-07-25"])
    weight: float | None = Field(
        default=None,
        description="The weight of the pet in kilograms.",
        examples=[12.5])
    weight_tracking_enabled: bool = Field(
        default=False,
        description="Whether this pet is included in weight check-ins.",
        examples=[True])
    weight_frequency: Literal["weekly", "biweekly", "monthly"] = Field(
        default="monthly",
        description="How often a weight check-in is scheduled for this pet.",
        examples=["monthly"])


class PetUpdate(BaseModel):
    """Schema for updating a pet"""
    name: str | None = Field(
        default=None, max_length=50,
        description="The name of the pet.",
        examples=["Flash"])
    species: str | None = Field(
        default=None, max_length=50,
        description="The species of the pet.",
        examples=["Dog"])
    breed: str | None = Field(
        default=None, max_length=50,
        description="The breed of the pet.",
        examples=["Labrador Retriever"])
    birth_date: date | None = Field(
        default=None,
        description="The birth date of the pet.",
        examples=["2026-07-25"])
    weight: float | None = Field(
        default=None,
        description="The weight of the pet in kilograms.",
        examples=[12.5])
    weight_tracking_enabled: bool | None = Field(
        default=None,
        description="Whether this pet is included in weight check-ins.",
        examples=[True])
    weight_frequency: Literal["weekly", "biweekly", "monthly"] | None = Field(
        default=None,
        description="How often a weight check-in is scheduled for this pet.",
        examples=["monthly"])


class PetResponse(BaseModel):
    """Schema for returning pet data"""
    id: int
    user_id: int
    name: str
    species: str
    breed: str | None = None
    birth_date: date | None = None
    weight: float | None = None
    weight_tracking_enabled: bool
    weight_frequency: str
    photo_filename: str | None = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes = True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "name": "Flash",
                "species": "Dog",
                "breed": "Labrador Retriever",
                "birth_date": "2026-07-25",
                "weight": 12.5,
                "weight_tracking_enabled": False,
                "weight_frequency": "monthly",
                "created_at": "2023-12-31T12:00:00"
            }
        }
    )
