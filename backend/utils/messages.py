import json

from database import SessionLocal
from models.models import ChatMessage, QuestionUsage


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


def save_question_usage(usage_id: int, answered: bool, input_tokens: int, output_tokens: int) -> None:
    """Record how a question ended and the tokens it used. Opens its own session, as it runs at the end of the answer's stream."""
    db = SessionLocal()
    try:
        row = db.get(QuestionUsage, usage_id)
        if row is not None:
            row.answered = answered
            row.input_tokens = input_tokens
            row.output_tokens = output_tokens
            db.commit()
    finally:
        db.close()
