"""Activity days for the admin dashboard: which accounts used the app on which day, and from which app."""

import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from config import settings
from models.models import ActivityDay, User
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# The apps name themselves in the X-Client header. Anything else, such as an app build from before the header, counts as unknown.
PLATFORMS = ("web", "android", "ios")

# Activity rows are kept 13 months, then deleted
KEEP_DAYS = 396

# Where each day starts and ends. A mistyped setting falls back to UTC rather than failing every request.
try:
    _ZONE = ZoneInfo(settings.STATS_TIMEZONE)
except Exception:
    logger.warning("STATS_TIMEZONE %r is not a timezone, activity days use UTC", settings.STATS_TIMEZONE)
    _ZONE = ZoneInfo("UTC")

# What this process already wrote today, so only the first request of the day per account and app touches the database
_seen: set[tuple[int, str]] = set()
_seen_day: date | None = None


def today() -> date:
    """Today in the owner's timezone."""
    return datetime.now(_ZONE).date()


def record_activity(db: Session, user: User, client: str | None) -> None:
    """Note that the account used the app today, once per day and app. A row already written by another process is left as it is."""
    global _seen_day
    day = today()
    if day != _seen_day:
        _seen.clear()
        _seen_day = day
    platform = client if client in PLATFORMS else "unknown"
    if (user.id, platform) in _seen:
        return
    db.execute(
        insert(ActivityDay)
        .values(user_id=user.id, day=day, platform=platform)
        .on_conflict_do_nothing(index_elements=["user_id", "day", "platform"])
    )
    db.commit()
    _seen.add((user.id, platform))


def purge_old_activity(db: Session) -> int:
    """Daily: delete activity rows older than 13 months. Returns how many were deleted."""
    count = db.query(ActivityDay).filter(ActivityDay.day < today() - timedelta(days=KEEP_DAYS)).delete()
    db.commit()
    return count
