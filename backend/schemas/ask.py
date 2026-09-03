from pydantic import BaseModel, Field


# Schemas for the ask endpoint
class AskRequest(BaseModel):
    """Schema for creating a new ask"""
    pet_id: int = Field(
        description="The ID of the pet associated with the ask.",
        examples=[1])
    question: str = Field(
        max_length=500,
        description="The question being asked.",
        examples=["What is the best diet for my dog?"])