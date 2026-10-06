"""What an account can do: the free month, premium and the locked state."""

from datetime import datetime, timedelta
from types import SimpleNamespace

from models.models import QuestionUsage, User
from utils.access import (
    GRANTED,
    LOCKED,
    PREMIUM,
    TRIAL,
    TRIAL_QUESTIONS_PER_DAY,
    access_state,
    has_full_access,
    trial_days_left,
)


def test_access_follows_the_trial_grants_and_purchases():
    """Access is worked out from the stored fields at a given moment, so every state and edge can be checked without waiting a month."""
    now = datetime(2026, 10, 1, 12, 0)
    ended = now - timedelta(days=40)

    def account(**fields):
        return SimpleNamespace(**{"trial_ends_at": now + timedelta(days=1), "premium_source": None, "premium_expires_at": None} | fields)

    # The trial is open until the moment it ends, then the account locks
    assert access_state(account(), now) == TRIAL
    assert access_state(account(trial_ends_at=now), now) == LOCKED
    assert access_state(account(trial_ends_at=ended), now) == LOCKED

    # A grant with no end date is lifetime, and one with an end date runs out like anything else
    assert access_state(account(trial_ends_at=ended, premium_source="granted"), now) == GRANTED
    assert access_state(account(trial_ends_at=ended, premium_source="granted", premium_expires_at=now + timedelta(days=5)), now) == GRANTED
    assert access_state(account(trial_ends_at=ended, premium_source="granted", premium_expires_at=now - timedelta(days=5)), now) == LOCKED

    # A purchase lasts until its end date, and one without an end date never counts
    assert access_state(account(trial_ends_at=ended, premium_source="purchased", premium_expires_at=now + timedelta(days=5)), now) == PREMIUM
    assert access_state(account(trial_ends_at=ended, premium_source="purchased", premium_expires_at=now - timedelta(seconds=1)), now) == LOCKED
    assert access_state(account(trial_ends_at=ended, premium_source="purchased"), now) == LOCKED

    # Buying during the trial makes the account premium straight away
    assert access_state(account(premium_source="purchased", premium_expires_at=now + timedelta(days=30)), now) == PREMIUM

    assert has_full_access(account(), now)
    assert not has_full_access(account(trial_ends_at=ended), now)


def test_trial_days_left_counts_the_last_day_as_one():
    """The trial warnings and the deleted account fingerprint both read this, so a last partial day still counts."""
    now = datetime(2026, 10, 1, 12, 0)
    assert trial_days_left(SimpleNamespace(trial_ends_at=now + timedelta(days=30)), now) == 30
    assert trial_days_left(SimpleNamespace(trial_ends_at=now + timedelta(hours=3)), now) == 1
    assert trial_days_left(SimpleNamespace(trial_ends_at=now), now) == 0
    assert trial_days_left(SimpleNamespace(trial_ends_at=now - timedelta(days=2)), now) == 0


def test_the_account_reports_its_premium_status(client, auth, db):
    """The apps read the trial countdown, the locked state and the web subscription from the account itself."""
    headers = auth()
    me = client.get("/auth/me", headers=headers).json()
    assert me["access"] == "trial"
    assert me["trial_days_left"] == 30
    assert me["premium_expires_at"] is None
    assert me["has_web_subscription"] is False

    user = db.query(User).one()
    user.trial_ends_at = datetime.now() - timedelta(days=1)
    db.commit()
    me = client.get("/auth/me", headers=headers).json()
    assert me["access"] == "locked"
    assert me["trial_days_left"] == 0

    user.premium_source = "purchased"
    user.premium_expires_at = datetime.now() + timedelta(days=30)
    user.stripe_customer_id = "cus_test"
    db.commit()
    me = client.get("/auth/me", headers=headers).json()
    assert me["access"] == "premium"
    assert me["has_web_subscription"] is True


def test_locked_account_can_read_and_delete_but_not_add_or_change(client, pet, db, monkeypatch):
    """After the trial, reading, exporting, settings and deleting stay open. Adding, changing and asking need premium."""
    monkeypatch.setattr("rag.retrieve", lambda *args, **kwargs: [])
    headers, pet_data = pet
    user = db.query(User).one()
    user.trial_ends_at = datetime.now() - timedelta(days=1)
    db.commit()

    r = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers)
    assert r.status_code == 403
    assert r.json()["code"] == "subscription_required"
    assert client.patch(f"/pets/{pet_data['id']}", json={"name": "Tom"}, headers=headers).status_code == 403
    assert client.post("/ask", json={"pet_id": pet_data["id"], "question": "Why is my cat sneezing?"}, headers=headers).status_code == 403

    assert client.get("/pets", headers=headers).status_code == 200
    assert client.get(f"/pets/{pet_data['id']}/export", headers=headers).status_code == 200
    assert client.patch("/auth/me", json={"language": "fr"}, headers=headers).status_code == 200
    assert client.delete(f"/pets/{pet_data['id']}", headers=headers).status_code == 204

    # A grant unlocks everything again
    user.premium_source = "granted"
    db.commit()
    assert client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).status_code == 201


def test_trial_questions_stop_at_the_daily_allowance(client, pet, db, monkeypatch):
    """A trial account gets TRIAL_QUESTIONS_PER_DAY questions, counted apart from the chat. Premium has no limit."""
    monkeypatch.setattr("rag.retrieve", lambda *args, **kwargs: [])
    headers, pet_data = pet
    user = db.query(User).one()
    db.add_all([QuestionUsage(user_id=user.id) for _ in range(TRIAL_QUESTIONS_PER_DAY)])
    db.commit()

    question = {"pet_id": pet_data["id"], "question": "Why is my cat sneezing?"}
    r = client.post("/ask", json=question, headers=headers)
    assert r.status_code == 429
    assert r.json()["code"] == "trial_question_limit"

    # Deleting the chat does not give the questions back
    assert client.delete(f"/pets/{pet_data['id']}/messages", headers=headers).status_code == 204
    assert client.post("/ask", json=question, headers=headers).status_code == 429

    user.premium_source = "granted"
    db.commit()
    assert client.post("/ask", json=question, headers=headers).status_code == 200
    assert db.query(QuestionUsage).count() == TRIAL_QUESTIONS_PER_DAY + 1
