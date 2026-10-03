import math
from datetime import datetime
from zoneinfo import ZoneInfo

from config import settings
from fastapi import Depends, Request
from models.models import QuestionUsage, User
from sqlalchemy.orm import Session
from utils.exceptions import ForbiddenException, TooManyRequestsException
from utils.security import get_current_user

# What an account can do right now. Worked out from its stored fields on every check and never saved, so it can't go out of date.
TRIAL = "trial"
PREMIUM = "premium"
GRANTED = "granted"
LOCKED = "locked"

# Questions a trial account can ask per day, counted from midnight in its own timezone. Premium has no limit.
TRIAL_QUESTIONS_PER_DAY = 30

# Days before an account locks when its owner is warned, by email, push and the in-app banner
LOCK_WARNING_DAYS = (7, 3, 1)

# Reading and deleting never need premium: a locked account keeps its own data and can always remove it.
_OPEN_METHODS = {"GET", "HEAD", "OPTIONS", "DELETE"}


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


def access_ends_at(user: User, now: datetime | None = None) -> datetime | None:
    """When the account locks if nothing changes: the later of the trial end and the end of a premium that won't renew.

    None when it isn't going to lock: a lifetime grant, a purchase that renews, or an account that is already locked."""
    now = now or datetime.now()
    if access_state(user, now) == LOCKED:
        return None
    if user.premium_source == "granted" and user.premium_expires_at is None:
        return None
    # A purchase whose renewal is unknown counts as renewing, so nobody is warned by mistake
    if user.premium_source == "purchased" and user.premium_renews is not False and user.premium_expires_at and user.premium_expires_at > now:
        return None
    return max(d for d in (user.trial_ends_at, user.premium_expires_at) if d)


def days_until_locked(user: User, now: datetime | None = None) -> int | None:
    """Whole days until the account locks, rounded up like trial_days_left. None when it isn't going to."""
    now = now or datetime.now()
    ends = access_ends_at(user, now)
    return None if ends is None else max(0, math.ceil((ends - now).total_seconds() / 86400))


def require_access_to_write(request: Request, current_user: User = Depends(get_current_user)) -> None:
    """Router dependency: once the account is locked, refuse anything that adds or changes data. Reads and deletes always pass."""
    if request.method not in _OPEN_METHODS and not has_full_access(current_user):
        raise ForbiddenException(
            "Companion Premium is needed to add or change anything. Your data stays readable and exportable.",
            code="subscription_required",
        )


def _start_of_local_day(user: User, now: datetime) -> datetime:
    """Midnight today in the user's timezone, as a naive server time comparable with the stored timestamps."""
    try:
        zone = ZoneInfo(user.timezone)
    except Exception:
        zone = ZoneInfo(settings.TIMEZONE)
    midnight = now.astimezone(zone).replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.astimezone().replace(tzinfo=None)


def questions_today(db: Session, user: User, now: datetime | None = None) -> int:
    """Count the questions the account has asked since midnight in its own timezone."""
    since = _start_of_local_day(user, now or datetime.now())
    return db.query(QuestionUsage).filter(QuestionUsage.user_id == user.id, QuestionUsage.created_at >= since).count()


def check_question_allowance(db: Session, user: User) -> None:
    """Refuse a trial account's question once today's allowance is used. Premium and granted accounts have no limit."""
    if access_state(user) == TRIAL and questions_today(db, user) >= TRIAL_QUESTIONS_PER_DAY:
        raise TooManyRequestsException(
            f"You've used all {TRIAL_QUESTIONS_PER_DAY} of today's free trial questions. The count resets at midnight.",
            code="trial_question_limit",
            limit=TRIAL_QUESTIONS_PER_DAY,
        )