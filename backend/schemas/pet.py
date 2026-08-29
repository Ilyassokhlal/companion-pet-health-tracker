from datetime import datetime, date
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

# One entry in a tag list. The length matches the ARRAY(String(100)) column, so an over-long entry comes back as a 422 rather than a 500 from Postgres truncating it.
TagEntry = Annotated[str, Field(min_length=1, max_length=100)]

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
    walk_tracking_enabled: bool = Field(
        default=False,
        description="Whether this pet is included in walk tracking.",
        examples=[True])
    dietary_restrictions: list[TagEntry] = Field(
        default_factory=list,
        description="Dietary restrictions and allergies, one per entry.",
        examples=[["Chicken", "Grain-free"]])
    disabilities: list[TagEntry] = Field(
        default_factory=list,
        description="Disabilities, one per entry.",
        examples=[["Deaf in left ear"]])


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
    walk_tracking_enabled: bool | None = Field(
        default=None,
        description="Whether this pet is included in walk tracking.",
        examples=[True])
    dietary_restrictions: list[TagEntry] | None = Field(
        default=None,
        description="Dietary restrictions and allergies, one per entry.",
        examples=[["Chicken", "Grain-free"]])
    disabilities: list[TagEntry] | None = Field(
        default=None,
        description="Disabilities, one per entry.",
        examples=[["Deaf in left ear"]])


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
    walk_tracking_enabled: bool
    weight_frequency: str
    dietary_restrictions: list[str]
    disabilities: list[str]
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
                "dietary_restrictions": ["Chicken", "Grain-free"],
                "disabilities": ["Deaf in left ear"],
                "weight_tracking_enabled": False,
                "walk_tracking_enabled": False,
                "weight_frequency": "monthly",
                "created_at": "2023-12-31T12:00:00"
            }
        }
    )
