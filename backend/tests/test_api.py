"""API tests. These never call the Anthropic API — /ask is exercised only on its guardrail
path, where an empty Chroma collection triggers the refusal branch before any request."""

import io
import zipfile
from datetime import date, datetime, timedelta, timezone

import pytest

import rag
from config import settings
from models.models import User
from utils.reminders import send_due_reminders
from utils.weight import next_checkin_date


def test_health_check(client):
    """The /health endpoint should return a 200 status and a JSON body indicating the service is healthy."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_returns_token(client, auth):
    """Registering a new user returns an access token."""
    headers = auth()
    assert "Authorization" in headers
    assert headers["Authorization"].startswith("Bearer ")

def test_login_returns_a_working_token(client, auth):
    """Logging in with correct credentials returns a token that opens a protected route."""
    headers = auth()
    r = client.get("/pets", headers=headers)
    assert r.status_code == 200

def test_duplicate_email_is_rejected(client, auth):
    """Registering a user with an email that already exists should return a 409 Conflict error."""
    auth()  # Register the first user
    r = client.post("/auth/register", json={"username": "anotheruser", "email": "testuser@example.com", "password": "password"})
    assert r.status_code == 409
    assert r.json()["detail"] == "User with email 'testuser@example.com' already exists"


def test_login_with_wrong_password_is_rejected(client, auth):
    """Logging in with the wrong password should return a 401 Unauthorized error."""
    auth()  # Register the user
    r = client.post("/auth/login", json={"email": "testuser@example.com", "password": "wrongpassword"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


def test_pets_require_authentication(client):
    """All pet endpoints should require authentication and return a 401 Unauthorized error if no token is provided."""
    r = client.get("/pets")
    assert r.status_code == 401
    assert r.json()["detail"] == "Not authenticated"


def test_pet_lifecycle(client, pet):
    """Create, list, patch, delete."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    # List pets
    r = client.get("/pets", headers=headers)
    assert r.status_code == 200
    assert any(p["id"] == pet_id for p in r.json())

    # Patch pet
    r = client.patch(f"/pets/{pet_id}", json={"name": "Fluffy Updated"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Fluffy Updated"

    # Delete pet
    r = client.delete(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 204

    # Ensure pet is deleted
    r = client.get(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 404


def test_users_cannot_reach_each_others_pets(client, pet, auth):
    """Register a second user. Every route on the first user's pet must 404."""
    _, pet_data = pet
    pet_id = pet_data["id"]
    # Register a second user
    headers2 = auth(username="seconduser", email="seconduser@example.com")
    # Attempt to access the first user's pet
    r = client.get(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404
    r = client.patch(f"/pets/{pet_id}", json={"name": "Hacked"}, headers=headers2)
    assert r.status_code == 404
    r = client.delete(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404


def test_record_requires_valid_type(client, pet):
    """Creating a record with an invalid type should return a 422 Unprocessable Entity error."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    r = client.post(f"/pets/{pet_id}/records", json={"record_type": "invalid_type"}, headers=headers)
    assert r.status_code == 422


def test_record_lifecycle(client, pet):
    """Create, list, patch, delete."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    # Create record
    r = client.post(f"/pets/{pet_id}/records", json={"record_type": "Vet Visit", "title": "Annual checkup", "date": "2026-01-15"}, headers=headers)
    assert r.status_code == 201
    record_id = r.json()["id"]

    # List records
    r = client.get(f"/pets/{pet_id}/records", headers=headers)
    assert r.status_code == 200
    assert any(rec["id"] == record_id for rec in r.json())

    # Patch record
    r = client.patch(f"/records/{record_id}", json={"description": "Updated checkup"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["description"] == "Updated checkup"

    # Delete record
    r = client.delete(f"/records/{record_id}", headers=headers)
    assert r.status_code == 204

    # Ensure record is deleted
    r = client.get(f"/pets/{pet_id}/records", headers=headers)
    assert r.json() == []


def test_ask_declines_when_corpus_is_empty(client, pet):
    """When the pet has no records, /ask should return a 400 error indicating that the corpus is empty."""
    # Ensure the pet has no records
    headers, pet_data = pet
    pet_id = pet_data["id"]

    # Add a record to ensure /ask can proceed
    r = client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my pet?"}, headers=headers)

    # Check that the response indicates no sources were found
    assert r.status_code == 200
    body = r.json()
    assert body["confidence"] == "none"
    assert body["sources"] == []


def test_chat_history_is_persisted(client, pet):
    """An out-of-scope reply is stored alongside the user's question."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    r = client.post(
        "/ask",
        json={"pet_id": pet_id, "question": "What should I feed my pet?"},
        headers=headers,
    )
    assert r.status_code == 200
    answer = r.json()["answer"]

    r = client.get(f"/pets/{pet_id}/messages", headers=headers)
    assert r.status_code == 200
    history = r.json()
    assert [msg["role"] for msg in history] == ["user", "assistant"]
    assert history[0]["content"] == "What should I feed my pet?"
    assert history[1]["content"] == answer

def test_ask_returns_answer_with_sources(client, pet, monkeypatch, tmp_path):
    """With a corpus indexed, /ask streams tokens and reports the sources it used."""


    (tmp_path / "doc1.txt").write_text(
        "Feeding a dog a balanced diet matters for its long term health. Adult dogs "
        "generally do well on two measured meals a day, and portion size should be "
        "adjusted to body condition rather than the label on the bag."
    )
    (tmp_path / "doc2.txt").write_text(
        "Cats are obligate carnivores and need a diet high in animal protein. Wet food "
        "helps maintain hydration, which supports urinary tract health in cats that "
        "drink little water."
    )

    # Ingest the documents into the RAG system
    rag.ingest(str(tmp_path))

    # Mock the RAG generate function to return a fixed response
    monkeypatch.setattr(rag, "generate", lambda messages, lang=None: iter(["Kennel ", "cough."]))

    # Get headers and pet data from the fixture
    headers, pet_data = pet

    # Extract the pet ID for the request
    pet_id = pet_data["id"]

    # Ask a question using the /ask endpoint
    r = client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my pet?"}, headers=headers)

    # Check that the response contains the expected tokens and sources
    assert r.status_code == 200
    import json
    lines = r.text.strip().split("\n")
    data = [json.loads(line) for line in lines]
    assert any("token" in item for item in data)
    assert "meta" in data[-1] and data[-1]["meta"]["sources"]

    r.text.strip().split("\n")

def test_record_photos_are_isolated_between_users(client, auth, pet):
    """User B must not be able to read or delete user A's photos."""

    # Create a record and upload a photo for user A
    headers_a, pet_a = pet

    # Create a record for user A
    r = client.post(f"/pets/{pet_a['id']}/records", json={"title": "Vaccination", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers_a)
    assert r.status_code == 201
    record_id = r.json()["id"]

    # Upload a photo for the record
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", b"fake-bytes", "image/jpeg")}, headers=headers_a)
    assert r.status_code == 201
    photo_id = r.json()[0]["id"]

    # Attempt to access the photo as user B
    headers_b = auth(username="userb", email="userb@example.com")
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_b)
    assert r.status_code == 404
    r = client.delete(f"/record-photos/{photo_id}", headers=headers_b)
    assert r.status_code == 404

    # Verify that user A can still access the photo
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_photo_upload_rejects_bad_type_and_oversize(client, pet):
    """Only jpeg/png/webp under the size cap are accepted."""

    # Get headers and pet data from the fixture
    headers, pet_data = pet

    # Extract the pet ID for the request
    pet_id = pet_data["id"]

    # Create a record for the pet
    r = client.post(f"/pets/{pet_id}/records", json={"title": "Test", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers)

    # Extract the record ID from the response
    assert r.status_code == 201
    record_id = r.json()["id"]
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.txt", b"fake-bytes", "text/plain")}, headers=headers)
    assert r.status_code == 400

    # Attempt to upload a photo with an invalid file type or an oversized file, expecting a 400 Bad Request response.
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", b"x" * (settings.MAX_PHOTO_MB * 1024 * 1024 + 1), "image/jpeg")}, headers=headers)
    assert r.status_code == 400


def test_gate_query_replaces_only_whole_words():
    """A pet's name must not be substituted inside unrelated words.

    A pet called "Bo" once turned "Bo has a boil on his body" into
    "Dog has a Dogil on his Dogdy", which then failed the scope gate for
    reasons invisible to the user.
    """
    from types import SimpleNamespace

    from routers.ask import _gate_query

    bo = SimpleNamespace(name="Bo", species="Dog")
    assert _gate_query("Bo has a boil on his body", bo) == "Dog has a boil on his body"

    sam = SimpleNamespace(name="Sam", species="Dog")
    assert _gate_query("is the same dose safe for Sam", sam) == "is the same dose safe for Dog"

    cat = SimpleNamespace(name="Cat", species="Cat")
    assert _gate_query("should I use a catheter", cat) == "should I use a catheter"


def test_timezones_are_listed(client, auth):
    """The picker's list comes from the server's own tzdata, not the client's Intl."""
    headers = auth()
    r = client.get("/auth/timezones", headers=headers)
    assert r.status_code == 200
    timezones = r.json()
    assert "America/Los_Angeles" in timezones
    assert len(timezones) > 100

    r = client.get("/auth/timezones")
    assert r.status_code == 401


def test_username_can_be_changed(client, auth):
    """PATCH /auth/me updates the username without touching anything else."""
    headers = auth()

    r = client.patch("/auth/me", headers=headers, json={"username": "renamed"})
    assert r.status_code == 200
    assert r.json()["username"] == "renamed"

    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200

    body = r.json()
    assert body["username"] == "renamed"
    assert "email" in body


def test_avatar_upload_and_removal(client, auth):
    """Uploading sets photo_filename; deleting clears it and 400s when there is none."""
    headers = auth()

    r = client.post("/auth/me/photo", headers=headers, files={"file": ("a.jpg", b"fake-bytes", "image/jpeg")})
    assert r.status_code == 200
    assert r.json()["photo_filename"].endswith(".jpg")

    r = client.delete("/auth/me/photo", headers=headers)
    assert r.status_code == 200
    assert r.json()["photo_filename"] is None

    r = client.delete("/auth/me/photo", headers=headers)
    assert r.status_code == 400

    r = client.post("/auth/me/photo", headers=headers, files={"file": ("a.txt", b"...", "text/plain")})
    assert r.status_code == 400


def test_change_password_invalidates_the_old_token(client, auth):
    """The fp claim kills every existing token; the response carries a fresh one."""
    headers = auth()

    r = client.post("/auth/change-password", headers=headers, json={"current_password": "password", "new_password": "newpassword"})
    assert r.status_code == 200
    new_token = r.json()["access_token"]
    assert new_token != headers["Authorization"].split(" ")[1]

    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 401

    new_headers = {"Authorization": f"Bearer {new_token}"}
    r = client.get("/auth/me", headers=new_headers)
    assert r.status_code == 200

    r = client.post("/auth/change-password", headers=new_headers, json={"current_password": "wrongpassword", "new_password": "anothernewpassword"})
    assert r.status_code == 401


def test_short_follow_up_inherits_the_previous_question():
    """A question too short to retrieve on is expanded with the previous one."""
    from routers.ask import _with_context

    assert _with_context("how often?", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]).startswith("what vaccines does my dog need")
    assert _with_context("how often should a dog get the rabies vaccine", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]) == "how often should a dog get the rabies vaccine"
    assert _with_context("how often?", []) == "how often?"


@pytest.fixture(autouse=True)
def pinned_reminder_hour(monkeypatch):
    """The .env sets REMINDER_HOUR, but these tests pin it to 6 AM."""
    monkeypatch.setattr(settings, "REMINDER_HOUR", 6)


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

def _enable_tracking(client, headers, pet_id, frequency="monthly"):
    """Test enabling weight tracking for the user and the pet."""
    client.patch("/auth/me", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    client.patch(
        f"/pets/{pet_id}",
        json={"weight_tracking_enabled": True, "weight_frequency": frequency},
        headers=headers,
    ).raise_for_status()


def _checkins(client, headers, pet_id):
    events = client.get(f"/pets/{pet_id}/events", headers=headers).json()
    return [event for event in events if event["kind"] == "Weight Check-in"]


def test_next_checkin_date_advances_without_sliding():
    """Test that the next check-in date advances correctly based on the frequency and current date."""
    assert next_checkin_date(date(2026, 8, 30), "weekly", date(2026, 8, 30)) == date(2026, 9, 6)
    assert next_checkin_date(date(2026, 8, 30), "biweekly", date(2026, 8, 30)) == date(2026, 9, 13)
    # Three months late: the 1st is still the 1st, and the missed cycles are not replayed.
    assert next_checkin_date(date(2026, 1, 1), "monthly", date(2026, 4, 15)) == date(2026, 5, 1)
    # Completed early, before it was even due.
    assert next_checkin_date(date(2026, 9, 1), "monthly", date(2026, 8, 25)) == date(2026, 10, 1)
    # A short month clamps instead of overflowing.
    assert next_checkin_date(date(2026, 1, 31), "monthly", date(2026, 1, 31)) == date(2026, 2, 28)


def test_switching_tracking_on_and_off_manages_the_checkin(client, pet):
    """Test that switching tracking on creates a check-in and switching it off removes it."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id)
    checkins = _checkins(client, headers, pet_id)
    assert len(checkins) == 1
    assert checkins[0]["due_date"] == date.today().isoformat()

    client.patch(f"/pets/{pet_id}", json={"weight_tracking_enabled": False}, headers=headers).raise_for_status()
    assert _checkins(client, headers, pet_id) == []


def test_a_pending_checkin_blocks_the_next_one(client, pet):
    """Test that a pending check-in blocks the creation of the next one."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id)
    client.patch(f"/pets/{pet_id}", json={"weight_frequency": "weekly"}, headers=headers).raise_for_status()
    client.patch("/auth/me", json={"timezone": "UTC"}, headers=headers).raise_for_status()

    assert len(_checkins(client, headers, pet_id)) == 1


def test_completing_a_checkin_schedules_the_next(client, pet):
    """Test that completing a check-in schedules the next one."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id, frequency="weekly")
    checkin = _checkins(client, headers, pet_id)[0]

    r = client.post(f"/events/{checkin['id']}/complete", headers=headers)
    assert r.status_code == 201
    assert r.json()["record_type"] == "Weight"

    following = _checkins(client, headers, pet_id)
    assert len(following) == 1
    assert following[0]["due_date"] == (date.today() + timedelta(days=7)).isoformat()


def test_only_the_newest_weight_record_moves_the_pets_weight(client, pet):
    """Test that only the newest weight record updates the pet's displayed weight."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    old = client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Weight", "title": "Weigh-in", "date": "2026-01-01", "weight_kg": 10.0},
        headers=headers,
    ).json()
    client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Weight", "title": "Weigh-in", "date": "2026-08-01", "weight_kg": 12.0},
        headers=headers,
    ).raise_for_status()
    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight"] == 12.0

    client.patch(f"/records/{old['id']}", json={"weight_kg": 9.0}, headers=headers).raise_for_status()
    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight"] == 12.0


def test_photo_zip_contains_exactly_the_selected_photos(client, pet):
    """The archive holds one entry per selected photo, with the stored bytes intact."""
    headers, p = pet
    r = client.post(f"/pets/{p['id']}/records", json={"title": "Vet Visit", "record_type": "Vet Visit", "date": "2024-03-04"}, headers=headers)
    record_id = r.json()["id"]

    r = client.post(f"/records/{record_id}/photos", files=[("files", ("a.jpg", b"first-bytes", "image/jpeg")), ("files", ("b.png", b"second-bytes", "image/png"))], headers=headers)
    assert r.status_code == 201
    ids = [photo["id"] for photo in r.json()]

    r = client.get(f"/pets/{p['id']}/photos/download", params={"ids": ids}, headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"

    archive = zipfile.ZipFile(io.BytesIO(r.content))
    names = archive.namelist()
    assert len(names) == 2
    # The record's date and title name the entries, not the stored UUIDs.
    assert all(name.startswith("2024-03-04-Vet Visit-") for name in names)
    assert sorted(archive.read(n) for n in names) == sorted([b"first-bytes", b"second-bytes"])


def test_photo_zip_refuses_a_photo_belonging_to_another_user(client, auth, pet):
    """An id outside the requested pet is a 404, and nothing partial comes back."""
    headers_a, pet_a = pet
    r = client.post(f"/pets/{pet_a['id']}/records", json={"title": "Vaccination", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers_a)
    record_id = r.json()["id"]
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", b"fake-bytes", "image/jpeg")}, headers=headers_a)
    photo_id = r.json()[0]["id"]

    headers_b = auth(username="userb", email="userb@example.com")
    pet_b_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers_b).json()["id"]

    r = client.get(f"/pets/{pet_b_id}/photos/download", params={"ids": [photo_id]}, headers=headers_b)
    assert r.status_code == 404


def test_photo_zip_caps_the_selection(client, pet):
    """Eleven ids is refused before any ownership lookup or file read."""
    headers, p = pet
    r = client.get(f"/pets/{p['id']}/photos/download", params={"ids": list(range(1, 12))}, headers=headers)
    assert r.status_code == 400
    assert "too_many_photos" in r.text


def test_turning_the_account_switch_off_turns_every_pet_off(client, pet):
    """Turning the account switch off disables weight tracking for all pets."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    second_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]

    client.patch("/auth/me", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    for pid in (pet_id, second_id):
        client.patch(f"/pets/{pid}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
        assert len(_checkins(client, headers, pid)) == 1

    client.patch("/auth/me", json={"weight_tracking_enabled": False}, headers=headers).raise_for_status()

    for pid in (pet_id, second_id):
        assert client.get(f"/pets/{pid}", headers=headers).json()["weight_tracking_enabled"] is False
        assert _checkins(client, headers, pid) == []


def test_enabling_a_pet_turns_the_account_switch_on(client, pet):
    """Enabling weight tracking for a pet also enables it for the account."""
    headers, pet_data = pet
    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is False

    client.patch(f"/pets/{pet_data['id']}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()

    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is True
    # is_tracked needs BOTH switches, so a check-in appearing proves the account flipped too.
    assert len(_checkins(client, headers, pet_data["id"])) == 1


def test_creating_a_pet_with_tracking_turns_the_account_switch_on(client, auth):
    """Creating a pet with weight tracking enabled also turns on the account switch."""
    headers = auth()
    r = client.post(
        "/pets",
        json={"name": "Fluffy", "species": "cat", "weight_tracking_enabled": True},
        headers=headers,
    )
    assert r.status_code == 201
    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is True
    assert len(_checkins(client, headers, r.json()["id"])) == 1


def test_an_unrelated_preference_change_leaves_tracking_alone(client, pet):
    """Changing an unrelated account preference does not affect weight tracking."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.patch(f"/pets/{pet_id}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()

    client.patch("/auth/me", json={"reminder_frequency": "daily"}, headers=headers).raise_for_status()

    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight_tracking_enabled"] is True
    assert len(_checkins(client, headers, pet_id)) == 1


def test_logging_a_walk_returns_it_and_lists_newest_first(client, pet):
    """Logging a walk returns it and ensures the newest walks appear first."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    older = client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-20", "duration_minutes": 30}, headers=headers)
    assert older.status_code == 201
    assert older.json()["distance_km"] is None
    assert older.json()["notes"] is None

    client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-27", "duration_minutes": 45, "distance_km": 3.2, "notes": "Limped a little."}, headers=headers).raise_for_status()

    walks = client.get(f"/pets/{pet_id}/walks", headers=headers).json()
    assert [w["date"] for w in walks] == ["2026-08-27", "2026-08-20"]
    assert walks[0]["distance_km"] == 3.2


def test_a_zero_minute_walk_is_refused(client, pet):
    """A walk with zero duration is invalid and should be refused."""
    headers, pet_data = pet
    r = client.post(f"/pets/{pet_data['id']}/walks", json={"date": "2026-08-27", "duration_minutes": 0}, headers=headers)
    assert r.status_code == 422


def test_walks_are_isolated_between_users(client, auth, pet):
    """Walks created by one user are not accessible by another user."""
    headers_a, pet_a = pet
    walk_id = client.post(f"/pets/{pet_a['id']}/walks", json={"date": "2026-08-27", "duration_minutes": 30}, headers=headers_a).json()["id"]

    headers_b = auth(username="userb", email="userb@example.com")
    assert client.get(f"/pets/{pet_a['id']}/walks", headers=headers_b).status_code == 404
    assert client.delete(f"/walks/{walk_id}", headers=headers_b).status_code == 404
    assert len(client.get(f"/pets/{pet_a['id']}/walks", headers=headers_a).json()) == 1


def test_turning_the_walk_switch_off_turns_every_pet_off(client, pet):
    """Turning the account-level walk tracking off should turn it off for all pets."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    second_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]

    for pid in (pet_id, second_id):
        client.patch(f"/pets/{pid}", json={"walk_tracking_enabled": True}, headers=headers).raise_for_status()
    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is True

    client.patch("/auth/me", json={"walk_tracking_enabled": False}, headers=headers).raise_for_status()

    for pid in (pet_id, second_id):
        assert client.get(f"/pets/{pid}", headers=headers).json()["walk_tracking_enabled"] is False


def test_enabling_walks_on_a_pet_turns_the_account_switch_on(client, pet):
    """Enabling walk tracking on a pet should turn on the account-level walk tracking."""
    headers, pet_data = pet
    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is False

    client.patch(f"/pets/{pet_data['id']}", json={"walk_tracking_enabled": True}, headers=headers).raise_for_status()

    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is True

def test_logging_an_expense_stamps_the_currency_and_lists_newest_first(client, pet):
    """An expense should have its currency set and the list of expenses should be ordered with the newest first."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    older = client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 12.5, "category": "food"}, headers=headers)
    assert older.status_code == 201
    assert older.json()["currency"] == "USD"

    client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-20", "amount": 90, "category": "vet", "notes": "Annual check."}, headers=headers).raise_for_status()

    expenses = client.get(f"/pets/{pet_id}/expenses", headers=headers).json()
    assert [e["date"] for e in expenses] == ["2026-08-20", "2026-08-02"]
    assert expenses[0]["category"] == "vet"


def test_an_unknown_category_and_a_free_expense_are_refused(client, pet):
    """An unknown category and a free expense should be refused."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    assert client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 10, "category": "toys"}, headers=headers).status_code == 422
    assert client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 0, "category": "food"}, headers=headers).status_code == 422


def test_expenses_are_isolated_between_users(client, auth, pet):
    """Expenses should be isolated between different users."""
    headers_a, pet_a = pet
    expense_id = client.post(f"/pets/{pet_a['id']}/expenses", json={"date": "2026-08-02", "amount": 10, "category": "food"}, headers=headers_a).json()["id"]

    headers_b = auth(username="other", email="other@example.com")
    assert client.get(f"/pets/{pet_a['id']}/expenses", headers=headers_b).status_code == 404
    assert client.delete(f"/expenses/{expense_id}", headers=headers_b).status_code == 404
    assert len(client.get(f"/pets/{pet_a['id']}/expenses", headers=headers_a).json()) == 1


def test_the_summary_totals_only_that_month_and_flags_the_limit(client, pet):
    """The summary should only include expenses from the specified month and indicate if the monthly budget is exceeded."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.patch(f"/pets/{pet_id}", json={"monthly_budget": 100}, headers=headers).raise_for_status()

    for payload in (
        {"date": "2026-08-02", "amount": 30, "category": "food"},
        {"date": "2026-08-15", "amount": 55, "category": "vet"},
        {"date": "2026-07-30", "amount": 500, "category": "vet"},
    ):
        client.post(f"/pets/{pet_id}/expenses", json=payload, headers=headers).raise_for_status()

    summary = client.get(f"/pets/{pet_id}/expense-summary?month=2026-08", headers=headers).json()
    assert summary["total"] == 85
    assert summary["limit"] == 100
    assert summary["percent"] == 85.0
    assert summary["status"] == "warning"
    assert summary["by_category"][0] == {"category": "vet", "total": 55.0}
    assert summary["currencies"] == ["USD"]


def test_a_pet_with_no_limit_reports_no_status(client, pet):
    """If a pet has no monthly budget set, the expense summary should report no status."""
    headers, pet_data = pet
    client.post(f"/pets/{pet_data['id']}/expenses", json={"date": "2026-08-02", "amount": 40, "category": "food"}, headers=headers).raise_for_status()

    summary = client.get(f"/pets/{pet_data['id']}/expense-summary?month=2026-08", headers=headers).json()
    assert summary["limit"] is None
    assert summary["percent"] is None
    assert summary["status"] == "none"


def test_an_expense_survives_the_record_it_was_attached_to(client, pet):
    """Deleting a health record should clear the link from the expense but keep the expense itself. The foreign key is SET NULL, not CASCADE."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    record_id = client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Vet Visit", "title": "Annual check", "date": "2026-08-15"},
        headers=headers,
    ).json()["id"]
    expense_id = client.post(
        f"/pets/{pet_id}/expenses",
        json={"date": "2026-08-15", "amount": 90, "category": "vet", "record_id": record_id},
        headers=headers,
    ).json()["id"]

    client.delete(f"/records/{record_id}", headers=headers).raise_for_status()

    remaining = client.get(f"/pets/{pet_id}/expenses", headers=headers).json()
    assert [e["id"] for e in remaining] == [expense_id]
    assert remaining[0]["record_id"] is None

def test_the_export_zip_holds_one_csv_per_dataset(client, pet):
    """Test that the export zip contains one CSV file per dataset."""

    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.post(f"/pets/{pet_id}/records", json={"title": "Annual check", "record_type": "Vet Visit", "date": "2026-08-15"}, headers=headers).raise_for_status()
    client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-16", "duration_minutes": 30, "distance_km": 2.5}, headers=headers).raise_for_status()
    client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-15", "amount": 90, "category": "vet"}, headers=headers).raise_for_status()

    r = client.get(f"/pets/{pet_id}/export?format=zip", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"

    archive = zipfile.ZipFile(io.BytesIO(r.content))
    assert sorted(archive.namelist()) == ["expenses.csv", "feedings.csv", "records.csv", "walks.csv"]
    assert "Annual check" in archive.read("records.csv").decode("utf-8-sig")
    assert "2.5" in archive.read("walks.csv").decode("utf-8-sig")
    assert "vet" in archive.read("expenses.csv").decode("utf-8-sig")
    # Nothing was ever fed, but the member still exists carrying its header row.
    assert archive.read("feedings.csv").decode("utf-8-sig").startswith("Date,Time,Food")


def test_the_csv_format_still_returns_the_zip(client, pet):
    """Test that requesting CSV format still returns a ZIP archive."""
    headers, pet_data = pet
    r = client.get(f"/pets/{pet_data['id']}/export?format=csv", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"


def test_the_pdf_export_excludes_expenses(client, pet):
    """Test that the PDF export does not include expense details."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.post(
        f"/pets/{pet_id}/expenses",
        json={"date": "2026-08-15", "amount": 90, "category": "vet", "notes": "SECRETPRICE"},
        headers=headers,
    ).raise_for_status()

    r = client.get(f"/pets/{pet_id}/export?format=pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert b"SECRETPRICE" not in r.content