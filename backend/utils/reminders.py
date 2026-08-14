from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from config import settings
from utils.mailer import send_reminder_email
from models.models import HealthRecord, Pet, User

def send_due_reminders(db: Session, today: date) -> int:
    """Email each user a digest of records due soon. Returns the number of emails sent."""
    # Calculate the cutoff date for reminders based on the configured lead time
    cutoff = today + timedelta(days=settings.REMINDER_LEAD_DAYS)

    # Query for health records that are due soon and have not yet had a reminder sent
    joined_query = (
        db.query(HealthRecord, Pet, User)
        .join(Pet, HealthRecord.pet_id == Pet.id)
        .join(User, Pet.user_id == User.id)
        .filter(
            HealthRecord.next_due_date <= cutoff,
            HealthRecord.next_due_date.isnot(None),
            HealthRecord.reminder_sent_at.is_(None),
            User.email_verified.is_(True),
            User.reminders_enabled.is_(True),
        )
    )

    # group records by user
    users_to_records = {}
    for record, pet, user in joined_query:
        if user.id not in users_to_records:
            users_to_records[user.id] = {
                "user": user,
                "records": [],
            }
        users_to_records[user.id]["records"].append((record, pet))

    emails_sent = 0
    for user_id, data in users_to_records.items():
        user = data["user"]
        records = data["records"]

        try:
            tz = ZoneInfo(user.timezone)
        except Exception:
            tz = ZoneInfo(settings.TIMEZONE)
        if datetime.now(tz).hour != settings.REMINDER_HOUR:
            continue

        items = [
            f"{record.title} for {pet.name} ({record.record_type.value}) — due {record.next_due_date}"
            for record, pet in records
        ]
        if send_reminder_email(user.email, user.username, items):
            emails_sent += 1
            # mark the records as having had a reminder sent
            for record, _ in records:
                record.reminder_sent_at = datetime.now()

    db.commit()
    return emails_sent
