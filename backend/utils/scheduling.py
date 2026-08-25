from sqlalchemy.orm import Session

from models.models import HealthRecord, ScheduledEvent, EventKind


def sync_followup_event(db: Session, record: HealthRecord) -> None:
    """Mirror record.next_due_date into a RECORD_FOLLOWUP event.

    Creates, updates, or deletes a follow-up event based on the record's next_due_date.
    """
    pending_event = db.query(ScheduledEvent).filter(
        ScheduledEvent.source_record_id == record.id,
        ScheduledEvent.completed_at.is_(None)
    ).first()

    if record.next_due_date is None:
        if pending_event:
            db.delete(pending_event)
        return

    if pending_event:
        pending_event.due_date = record.next_due_date
        pending_event.title = record.title
        return

    db.add(ScheduledEvent(
        pet_id=record.pet_id, title=record.title,
        kind=EventKind.RECORD_FOLLOWUP, due_date=record.next_due_date,
        source_record_id=record.id,
    ))

