from calendar import monthrange
from datetime import date, timedelta

from models.models import EventKind, HealthRecord, Pet, RecordType, ScheduledEvent
from sqlalchemy.orm import Session

# Fixed-length intervals. Monthly is calendar-based rather than a day count, so it is handled apart.
_INTERVAL_DAYS = {"weekly": 7, "biweekly": 14}


def sync_pet_weight(db: Session, record: HealthRecord) -> None:
    """Update the pet's weight if this record is the newest one."""
    if record.record_type != RecordType.WEIGHT or record.weight_kg is None:
        return

    has_newer = (
        db.query(HealthRecord.id)
        .filter(
            HealthRecord.pet_id == record.pet_id,
            HealthRecord.record_type == RecordType.WEIGHT,
            HealthRecord.id != record.id,
            HealthRecord.date > record.date,
        )
        .first()
    )
    if has_newer:
        return

    record.pet.weight = record.weight_kg


def _add_month(day: date) -> date:
    """Return the date one calendar month after the given date, clamped to the month's length."""
    year = day.year + day.month // 12
    month = day.month % 12 + 1
    return date(year, month, min(day.day, monthrange(year, month)[1]))


def next_checkin_date(anchor: date, frequency: str, today: date) -> date:
    """Return the next check-in date after today based on the anchor date and frequency."""
    step = _INTERVAL_DAYS.get(frequency)

    def advance(day: date) -> date:
        return day + timedelta(days=step) if step else _add_month(day)

    due = advance(anchor)
    while due <= today:
        due = advance(due)
    return due


def is_tracked(pet: Pet) -> bool:
    """Return True if the pet's weight is being tracked, False otherwise."""
    return pet.owner.weight_tracking_enabled and pet.weight_tracking_enabled


def pending_checkin(db: Session, pet: Pet) -> ScheduledEvent | None:
    """Return the pet's outstanding weight check-in, if it has one. There is never more than one."""
    return (
        db.query(ScheduledEvent)
        .filter(
            ScheduledEvent.pet_id == pet.id,
            ScheduledEvent.kind == EventKind.WEIGHT_CHECKIN,
            ScheduledEvent.completed_at.is_(None),
        )
        .first()
    )


def sync_checkin(db: Session, pet: Pet, today: date) -> None:
    """Synchronize the pet's weight check-in with its tracking status.

    If the pet is tracked and has no pending check-in, create one due today. If the pet is not tracked
    but has a pending check-in, delete it. A pet that already has a pending check-in is left alone,
    which prevents ignored check-ins from stacking up."""
    existing = pending_checkin(db, pet)
    if is_tracked(pet):
        if existing is None:
            db.add(ScheduledEvent(
                pet_id=pet.id,
                title="Weight check-in",
                kind=EventKind.WEIGHT_CHECKIN,
                due_date=today,
            ))
    elif existing is not None:
        db.delete(existing)