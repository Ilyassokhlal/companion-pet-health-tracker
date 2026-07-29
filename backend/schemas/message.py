from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MessageResponse(BaseModel):
    """Schema for returning a stored chat message"""
    id: int
    pet_id: int
    role: str = Field(description="Either 'user' or 'assistant'.", examples=["assistant"])
    content: str
    sources: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "pet_id": 1,
                "role": "assistant",
                "content": "Kennel cough is a common respiratory infection in dogs...",
                "sources": ["kennel_cough.txt"],
                "created_at": "2026-07-28T12:00:00",
            }
        },
    )