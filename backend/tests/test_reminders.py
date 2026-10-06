"""Due reminders, and the warnings before an account locks."""

from datetime import date, datetime, timedelta, timezone

from models.models import DeviceToken, User
from utils.reminders import send_due_reminders, send_lock_warnings


def _six_utc_today() -> tuple[datetime, datetime]:
    """6 AM UTC today, the pinned reminder hour for a UTC user, and the same moment as naive server time."""
    six = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0)
    return six, six.astimezone().replace(tzinfo=None)


def test_lock_warnings_go_out_7_3_and_1_days_before_the_trial_ends(client, auth, db, no_email, no_push):
    """Account notices: once per stage, at the owner's reminder hour, whatever the reminder settings say. Email needs a verified address, push doesn't."""
    auth()
    user = db.query(User).one()
    user.timezone = "UTC"
    user.reminders_enabled = False
    user.push_enabled = False
    db.add(DeviceToken(user_id=user.id, token="ExponentPushToken[test]", platform="android"))
    six, now = _six_utc_today()
    user.trial_ends_at = now + timedelta(days=6, hours=12)
    db.commit()
    no_email.clear()

    assert send_lock_warnings(db, six) == 1
    assert no_email == []
    assert no_push[-1]["title"] == "Your free month is ending"
    assert user.trial_ends_at.astimezone(timezone.utc).date().isoformat() in no_push[-1]["body"]
    assert send_lock_warnings(db, six) == 0

    user.email_verified = True
    user.trial_ends_at = now + timedelta(days=2, hours=12)
    db.commit()
    assert send_lock_warnings(db, six + timedelta(hours=1)) == 0
    assert send_lock_warnings(db, six) == 1
    assert no_email[-1]["subject"].startswith("Your free month of Companion ends on")
    assert "/premium" in no_email[-1]["html"]

    user.trial_ends_at = now + timedelta(hours=12)
    db.commit()
    assert send_lock_warnings(db, six) == 1
    db.refresh(user)
    assert user.lock_warning_sent == 1
    assert len(no_push) == 3


def test_only_a_premium_that_wont_renew_is_warned(client, auth, db, no_email):
    """A renewing purchase and a lifetime grant never lock, so they get no warning. A cancelled plan does."""
    headers = auth()
    user = db.query(User).one()
    user.timezone = "UTC"
    user.email_verified = True
    six, now = _six_utc_today()
    user.trial_ends_at = now - timedelta(days=20)
    user.premium_source = "purchased"
    user.premium_expires_at = now + timedelta(days=2, hours=12)
    user.premium_renews = True
    db.commit()
    no_email.clear()

    assert send_lock_warnings(db, six) == 0
    user.premium_renews = False
    db.commit()
    assert send_lock_warnings(db, six) == 1
    assert no_email[-1]["subject"].startswith("Your Companion Premium ends on")

    user.premium_expires_at = datetime.now() + timedelta(days=2, hours=12)
    db.commit()
    assert client.get("/auth/me", headers=headers).json()["days_until_locked"] == 3
    user.premium_renews = True
    db.commit()
    assert client.get("/auth/me", headers=headers).json()["days_until_locked"] is None

    user.premium_source = "granted"
    user.premium_expires_at = None
    user.lock_warning_sent = None
    db.commit()
    assert send_lock_warnings(db, six) == 0
    assert client.get("/auth/me", headers=headers).json()["days_until_locked"] is None


def _prepare_user(db, *, frequency="weekly", email=True, push=True, tz="UTC"):
    """Verify the test user and set their reminder preferences."""
    user = db.query(User).filter(User.email == "testuser@example.com").one()
    user.email_verified = True
    user.timezone = tz
    user.reminder_frequency = frequency
    user.reminders_enabled = email
    user.push_enabled = push
    db.commit()
    return user


def _at_six_utc(day: date) -> datetime:
    """Return a datetime at 6 AM UTC on the given day."""
    return datetime(day.year, day.month, day.day, 6, 0, tzinfo=timezone.utc)


def _schedule(client, headers, pet_id, title, due_date):
    """Schedule an event for the given pet."""
    client.post(
        "/events",
        json={"pet_id": pet_id, "title": title, "due_date": due_date},
        headers=headers,
    ).raise_for_status()


def _reminders(no_email):
    """Filter out only the upcoming pet care reminder emails."""
    return [message for message in no_email if message["subject"] == "Upcoming pet care"]


def test_weekly_email_fires_only_on_sunday(client, pet, db, no_email):
    """Test that weekly email reminders are sent only on Sundays."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "AlphaEvent", "2026-09-02")
    _prepare_user(db, frequency="weekly")

    sunday = date(2026, 8, 30)
    assert send_due_reminders(db, sunday, _at_six_utc(sunday)) == 1
    assert len(_reminders(no_email)) == 1
    assert "AlphaEvent" in _reminders(no_email)[0]["html"]

    no_email.clear()
    monday = date(2026, 8, 31)
    assert send_due_reminders(db, monday, _at_six_utc(monday)) == 0
    assert _reminders(no_email) == []


def test_daily_email_covers_today_and_not_the_week(client, pet, db, no_email):
    """Test that daily email reminders cover only today's events."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "AlphaEvent", "2026-08-30")
    _schedule(client, headers, pet_data["id"], "BetaEvent", "2026-09-02")
    _prepare_user(db, frequency="daily")

    today = date(2026, 8, 30)
    assert send_due_reminders(db, today, _at_six_utc(today)) == 1
    body = _reminders(no_email)[0]["html"]
    assert "AlphaEvent" in body
    assert "BetaEvent" not in body


def test_push_is_independent_of_the_email_toggle(client, pet, db, no_email, no_push):
    """Test that push notifications are sent even if email reminders are disabled."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "GammaEvent", "2026-08-30")
    client.post(
        "/devices",
        json={"token": "ExponentPushToken[test]", "platform": "android"},
        headers=headers,
    ).raise_for_status()
    _prepare_user(db, email=False, push=True)

    today = date(2026, 8, 30)
    assert send_due_reminders(db, today, _at_six_utc(today)) == 0
    assert _reminders(no_email) == []
    assert len(no_push) == 1
    assert "GammaEvent" in no_push[0]["body"]


def test_locked_accounts_get_no_reminders(client, pet, db, no_email):
    """Reminders stop with the lockout. The trial end warnings tell the owner so in advance."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "AlphaEvent", "2026-08-30")
    user = _prepare_user(db, frequency="daily")
    user.trial_ends_at = datetime.now() - timedelta(days=1)
    db.commit()

    today = date(2026, 8, 30)
    assert send_due_reminders(db, today, _at_six_utc(today)) == 0
    assert _reminders(no_email) == []


def test_no_channel_fires_outside_the_reminder_hour(client, pet, db, no_email, no_push):
    """Test that no reminders are sent outside the user's local reminder hour."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "DeltaEvent", "2026-08-30")
    _prepare_user(db, frequency="daily")

    today = date(2026, 8, 30)
    noon = datetime(2026, 8, 30, 12, 0, tzinfo=timezone.utc)
    assert send_due_reminders(db, today, noon) == 0
    assert _reminders(no_email) == []
    assert no_push == []


def test_due_today_follows_the_users_timezone_not_the_servers(client, pet, db, no_email):
    """At 6 AM in Auckland, the server is still on the previous date. Test that due today follows the user's timezone, not the server's."""
    headers, pet_data = pet
    _schedule(client, headers, pet_data["id"], "EpsilonEvent", "2026-08-31")
    _prepare_user(db, frequency="daily", tz="Pacific/Auckland")

    server_today = date(2026, 8, 30)
    six_in_auckland = datetime(2026, 8, 30, 18, 0, tzinfo=timezone.utc)
    assert send_due_reminders(db, server_today, six_in_auckland) == 1
    assert "EpsilonEvent" in _reminders(no_email)[0]["html"]
