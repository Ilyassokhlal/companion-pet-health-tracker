from models.models import OnboardingStep
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

# The Get started steps, in the order the apps show them
STEPS = ("pet", "record", "photo", "question", "appointment", "tracking")


def mark_step(db: Session, user_id: int, step: str) -> None:
    """Record that the account has done a Get started step. Only the first time is kept, and it saves with the caller's commit."""
    db.execute(insert(OnboardingStep).values(user_id=user_id, step=step).on_conflict_do_nothing(index_elements=["user_id", "step"]))
