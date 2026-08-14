from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class Citation(BaseModel):
    """One cited corpus passage, resolved to its public source."""
    title: str
    section: str = ""
    url: str = ""

class MessageResponse(BaseModel):
    """Schema for returning a stored chat message"""
    id: int
    pet_id: int
    role: str = Field(description="Either 'user' or 'assistant'.", examples=["assistant"])
    content: str
    sources: list[Citation] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "pet_id": 1,
                "role": "assistant",
                "content": "Kennel cough is a common respiratory infection in dogs...",
                "sources": [
                    {
                        "title": "Kennel Cough",
                        "section": "Symptoms",
                        "url": "https://en.wikipedia.org/wiki/Kennel_cough#Symptoms"
                    }
                ],
                "created_at": "2026-07-28T12:00:00",
            }
        },
    )