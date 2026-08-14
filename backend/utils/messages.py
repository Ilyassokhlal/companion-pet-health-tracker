import json
from database import SessionLocal
from models.models import ChatMessage


def save_message(pet_id: int, role: str, content: str, sources: list[dict] | None = None) -> None:
    """Persist one chat message. Opens its own session — it may be called from inside a stream generator."""
    db = SessionLocal()
    try:
        db.add(ChatMessage(
            pet_id=pet_id,
            role=role,
            content=content,
            sources=json.dumps(sources) if sources else None,
        ))
        db.commit()
    finally:
        db.close()