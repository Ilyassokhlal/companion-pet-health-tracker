from datetime import date as date_type
from datetime import time as time_type

from models.models import Feeding, FeedingTime
from sqlalchemy.orm import Session

MINUTES_IN_DAY = 24 * 60
LOOKBACK_MINUTES = 120


def to_minutes(value: time_type) -> int:
    return value.hour * 60 + value.minute


def forward_gap(start: int, end: int) -> int:
    """Minutes from start to end travelling forward around the clock."""
    return (end - start) % MINUTES_IN_DAY


def slot_window(slots: list[int], index: int) -> int:
    """How long a slot is considered active, from LOOKBACK_MINUTES before it until the next slot.

    This determines the window during which a feeding can be assigned to this slot."""
    following = slots[(index + 1) % len(slots)]
    ahead = forward_gap(slots[index], following) or MINUTES_IN_DAY
    return LOOKBACK_MINUTES + ahead


def assign_slot(slots: list[int], moment: int) -> int | None:
    """Assign a feeding at `moment` to the most appropriate slot, or None if it is off-schedule.

    The nearest slot within its active window wins, measured around the clock so a late-night feeding
    can belong to an early-morning slot. Each feeding is assigned to at most one slot."""
    best: int | None = None
    best_distance = MINUTES_IN_DAY
    for index, slot in enumerate(slots):
        start = (slot - LOOKBACK_MINUTES) % MINUTES_IN_DAY
        if forward_gap(start, moment) >= slot_window(slots, index):
            continue
        distance = min(forward_gap(slot, moment), forward_gap(moment, slot))
        if distance < best_distance:
            best, best_distance = slot, distance
    return best


def slot_status(slots: list[int], satisfied: set[int], now: int) -> dict[int, str]:
    """Determine the status of each slot relative to the current time.

    Returns a dictionary mapping each slot to one of "met", "due", "missed", or "upcoming".
    A slot is "met" if it has been satisfied, "missed" if its active window has passed without a feeding,
    "due" if it is currently within its active window, and "upcoming" if it is not yet active."""
    statuses: dict[int, str] = {}
    for index, slot in enumerate(slots):
        if slot in satisfied:
            statuses[slot] = "met"
            continue
        start = (slot - LOOKBACK_MINUTES) % MINUTES_IN_DAY
        elapsed = forward_gap(start, now)
        window = slot_window(slots, index)
        if elapsed >= window:
            statuses[slot] = "missed"
        elif now >= slot or forward_gap(slot, now) < forward_gap(now, slot):
            statuses[slot] = "due"
        else:
            statuses[slot] = "upcoming"
    return statuses


def pet_slots(db: Session, pet_id: int) -> list[int]:
    """Retrieve the feeding slots for a given pet, sorted by time."""
    rows = db.query(FeedingTime).filter(FeedingTime.pet_id == pet_id).all()
    return sorted(to_minutes(row.time) for row in rows)


def satisfied_slots(db: Session, pet_id: int, day: date_type, slots: list[int]) -> set[int]:
    """Determine which feeding slots have been satisfied by the actual feedings for a given day.

    Each feeding is assigned to at most one slot, and a slot is considered satisfied if it has at least one feeding assigned to it."""
    if not slots:
        return set()
    logs = db.query(Feeding).filter(Feeding.pet_id == pet_id, Feeding.date == day).all()
    covered = set()
    for log in logs:
        assigned = assign_slot(slots, to_minutes(log.time))
        if assigned is not None:
            covered.add(assigned)
    return covered