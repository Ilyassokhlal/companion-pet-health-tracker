import math
from datetime import datetime

from models.models import User

# What an account can do right now. Worked out from its stored fields on every check and never saved, so it can't go out of date.
TRIAL = "trial"
PREMIUM = "premium"
GRANTED = "granted"
LOCKED = "locked"


def access_state(user: User, now: datetime | None = None) -> str:
    """Return what the account can do right now: TRIAL, PREMIUM, GRANTED or LOCKED.

    A grant with no end date is lifetime. A purchase always has an end date, which the payment webhook keeps at the end of the paid period, or of the store's grace period when a payment fails, so a payment problem only locks the account once that date passes."""
    now = now or datetime.now()
    if user.premium_source == "granted" and (user.premium_expires_at is None or user.premium_expires_at > now):
        return GRANTED
    if user.premium_source == "purchased" and user.premium_expires_at is not None and user.premium_expires_at > now:
        return PREMIUM
    if user.trial_ends_at > now:
        return TRIAL
    return LOCKED


def has_full_access(user: User, now: datetime | None = None) -> bool:
    """Return True unless the account is locked."""
    return access_state(user, now) != LOCKED


def trial_days_left(user: User, now: datetime | None = None) -> int:
    """Return the whole days of trial left, rounded up so the last day counts as one. Zero once the trial has ended."""
    now = now or datetime.now()
    return max(0, math.ceil((user.trial_ends_at - now).total_seconds() / 86400))