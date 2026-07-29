from datetime import datetime, date
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


class PetResponse(BaseModel):
    """Schema for returning pet data"""
    id: int
    user_id: int
    name: str
    species: str
    breed: str | None = None
    birth_date: date | None = None
    weight: float | None = None
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
                "created_at": "2023-12-31T12:00:00"
            }
        }
    )
