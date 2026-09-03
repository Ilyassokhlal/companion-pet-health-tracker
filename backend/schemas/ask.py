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


class AskResponse(BaseModel):
    """Schema for returning ask data"""
    answer: str = Field(
        description="The answer to the question.",
        examples=["A balanced diet with high-quality protein is recommended for dogs."])
    sources: list[str] = Field(
        description="A list of sources for the answer.",
        examples=["https://www.akc.org/expert-advice/nutrition/best-dog-foods/"])
    confidence: float = Field(
        description="The confidence level of the answer.",
        examples=[0.95])
    