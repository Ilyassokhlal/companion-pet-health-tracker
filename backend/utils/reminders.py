from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from config import settings
from models.models import FeedingTime, Pet, ScheduledEvent, User
from sqlalchemy import or_
from sqlalchemy.orm import Session
from utils.access import LOCK_WARNING_DAYS, access_ends_at, days_until_locked, has_full_access
from utils.feeding import pet_slots, satisfied_slots, to_minutes
from utils.i18n import t
from utils.mailer import send_email, send_lock_warning_email, send_reminder_email
from utils.push import prune_tokens, send_push

# datetime.weekday() counts Monday as 0, so Sunday is 6.
_SUNDAY = 6


def _describe(event: ScheduledEvent, pet: Pet, lang: str | None = None) -> str:
    """One line of a digest: what it is, whose it is, its category when a record generated it, and when it is due."""
    if event.record_type:
        return t(
            "reminder.itemWithType", lang,
            title=event.title, pet=pet.name,
            type=t(f"recordType.{event.record_type.value}", lang),
            date=event.due_date,
        )
    return t("reminder.item", lang, title=event.title, pet=pet.name, date=event.due_date)


def send_due_reminders(db: Session, today: date, instant: datetime | None = None) -> int:
    """Send reminders for events due soon.

    This function sends email and push notifications for events that are due within the reminder horizon.
    Emails are sent according to the user's reminder frequency, and push notifications are sent for events due today.
    """
    horizon = today + timedelta(days=settings.REMINDER_LEAD_DAYS)
    moment = instant or datetime.now(timezone.utc)

    joined_query = (
        db.query(ScheduledEvent, Pet, User)
        .join(Pet, ScheduledEvent.pet_id == Pet.id)
        .join(User, Pet.user_id == User.id)
        .filter(
            ScheduledEvent.due_date <= horizon,
            ScheduledEvent.completed_at.is_(None),
            User.email_verified.is_(True),
        )
    )

    # group events by user
    users_to_events: dict[int, dict] = {}
    for event, pet, user in joined_query:
        if user.id not in users_to_events:
            users_to_events[user.id] = {"user": user, "events": []}
        users_to_events[user.id]["events"].append((event, pet))

    emails_sent = 0
    dead_tokens: list[str] = []
    for data in users_to_events.values():
        user = data["user"]
        events = data["events"]
        # A locked account gets no reminders. The trial end warnings tell the owner so in advance.
        if not has_full_access(user):
            continue

        try:
            tz = ZoneInfo(user.timezone)
        except Exception:
            tz = ZoneInfo(settings.TIMEZONE)
        now = moment.astimezone(tz)
        if now.hour != settings.REMINDER_HOUR:
            continue

        # Determine the current date in the user's local timezone. This is used to check which events are due today.
        local_today = now.date()
        outstanding = [(event, pet) for event, pet in events if event.due_date <= local_today]

        if user.reminders_enabled:
            if user.reminder_frequency == "weekly":
                selected = events if now.weekday() == _SUNDAY else []
            else:
                selected = outstanding
            if selected:
                items = [_describe(event, pet, user.language) for event, pet in selected]
                if send_reminder_email(user.email, user.username, items, user.language):
                    emails_sent += 1

        if user.push_enabled and outstanding:
            tokens = [device.token for device in user.device_tokens]
            if tokens:
                if len(outstanding) == 1:
                    body = _describe(outstanding[0][0], outstanding[0][1], user.language)
                else:
                    body = t("push.due.many", user.language, count=len(outstanding))
                dead_tokens.extend(send_push(tokens, t("push.due.title", user.language), body))

    # Prune any dead push tokens and return the number of emails sent.
    prune_tokens(db, dead_tokens)
    return emails_sent


def send_feeding_reminders(db: Session, instant: datetime | None = None) -> int:
    """Send feeding reminders for pets whose feeding slots are due."""
    moment = instant or datetime.now(timezone.utc)
    sent = 0

    rows = (
        db.query(FeedingTime, Pet, User)
        .join(Pet, FeedingTime.pet_id == Pet.id)
        .join(User, Pet.user_id == User.id)
        .filter(User.email_verified.is_(True))
        .all()
    )

    for feeding_time, pet, user in rows:
        if not (user.feeding_email_enabled or user.feeding_push_enabled):
            continue
        if not has_full_access(user):
            continue
        local = moment.astimezone(ZoneInfo(user.timezone or "UTC"))
        if (local.hour, local.minute) != (feeding_time.time.hour, feeding_time.time.minute):
            continue

        slots = pet_slots(db, pet.id)
        covered = satisfied_slots(db, pet.id, local.date(), slots)
        if to_minutes(feeding_time.time) in covered:
            continue

        title = t("push.feeding.title", user.language)
        body = t("push.feeding.body", user.language, pet=pet.name)
        if user.feeding_push_enabled:
            send_push([token.token for token in user.device_tokens], title, body)
        if user.feeding_email_enabled:
            send_email(user.email, title, f"<p>{body}</p>")
        sent += 1

    return sent


def _local_zone(user: User) -> ZoneInfo:
    """The user's timezone, or the server's when theirs is unknown."""
    try:
        return ZoneInfo(user.timezone)
    except Exception:
        return ZoneInfo(settings.TIMEZONE)


def send_lock_warnings(db: Session, instant: datetime | None = None) -> int:
    """Warn every account that locks within 7, 3 or 1 days, once per stage, at its owner's reminder hour.

    These are account notices, so they go out whatever the reminder and push settings say. Email only goes to a
    verified address, like every other notice. Returns how many accounts were warned.
    """
    moment = instant or datetime.now(timezone.utc)
    # Stored timestamps are naive server time
    now = moment.astimezone().replace(tzinfo=None)
    soon = now + timedelta(days=max(LOCK_WARNING_DAYS) + 1)
    users = db.query(User).filter(
        or_(User.trial_ends_at.between(now, soon), User.premium_expires_at.between(now, soon))
    ).all()

    warned = 0
    dead_tokens: list[str] = []
    for user in users:
        days = days_until_locked(user, now)
        # The last stage these days fall in: 7 for the whole last week, then 3, then 1
        stage = min((s for s in LOCK_WARNING_DAYS if days is not None and days <= s), default=None)
        if stage is None or (user.lock_warning_sent is not None and stage >= user.lock_warning_sent):
            continue
        tz = _local_zone(user)
        if moment.astimezone(tz).hour != settings.REMINDER_HOUR:
            continue

        ends = access_ends_at(user, now)
        kind = "trial" if ends == user.trial_ends_at else "premium"
        date = ends.astimezone(tz).date().isoformat()
        if user.email_verified:
            send_lock_warning_email(user.email, user.username, kind, date, user.language)
        tokens = [device.token for device in user.device_tokens]
        if tokens:
            title = t(f"push.lockWarning.{kind}Title", user.language)
            dead_tokens.extend(send_push(tokens, title, t("push.lockWarning.body", user.language, date=date)))
        user.lock_warning_sent = stage
        warned += 1

    db.commit()
    prune_tokens(db, dead_tokens)
    return warned
