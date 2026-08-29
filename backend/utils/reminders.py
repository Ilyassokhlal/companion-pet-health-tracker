from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from config import settings
from utils.mailer import send_reminder_email, send_email
from models.models import FeedingTime, Pet, ScheduledEvent, User
from utils.push import send_push, prune_tokens
from utils.feeding import pet_slots, satisfied_slots, to_minutes

# datetime.weekday() counts Monday as 0, so Sunday is 6.
_SUNDAY = 6


def _describe(event: ScheduledEvent, pet: Pet) -> str:
    """One line of a digest: what it is, whose it is, its category when a record generated it, and when it is due."""
    category = f" ({event.record_type.value})" if event.record_type else ""
    return f"{event.title} for {pet.name}{category} — due {event.due_date}"


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
                items = [_describe(event, pet) for event, pet in selected]
                if send_reminder_email(user.email, user.username, items):
                    emails_sent += 1

        if user.push_enabled and outstanding:
            tokens = [device.token for device in user.device_tokens]
            if tokens:
                if len(outstanding) == 1:
                    body = _describe(outstanding[0][0], outstanding[0][1])
                else:
                    body = f"{len(outstanding)} things are due today."
                dead_tokens.extend(send_push(tokens, "Due today", body))

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
        local = moment.astimezone(ZoneInfo(user.timezone or "UTC"))
        if (local.hour, local.minute) != (feeding_time.time.hour, feeding_time.time.minute):
            continue

        slots = pet_slots(db, pet.id)
        covered = satisfied_slots(db, pet.id, local.date(), slots)
        if to_minutes(feeding_time.time) in covered:
            continue

        title = "Feeding due"
        body = f"{pet.name} is due to be fed."
        if user.feeding_push_enabled:
            send_push([token.token for token in user.device_tokens], title, body)
        if user.feeding_email_enabled:
            send_email(user.email, title, f"<p>{body}</p>")
        sent += 1

    return sent