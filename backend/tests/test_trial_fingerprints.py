"""One free month per email, across deleted accounts and email changes."""

from datetime import datetime, timedelta

from models.models import TrialFingerprint, User
from utils.access import TRIAL, access_state
from utils.security import create_purpose_token
from utils.trial_fingerprints import email_hash, purge_expired_fingerprints


def test_deleting_during_the_trial_gives_the_days_back_to_a_returning_email(client, auth, db):
    """A deleted account leaves its remaining trial days for the same email, matched in any upper or lower case. A new email gets a full month."""
    headers = auth()
    user = db.query(User).one()
    user.trial_ends_at = datetime.now() + timedelta(days=10)
    db.commit()
    assert client.request("DELETE", "/auth/me", json={"password": "password"}, headers=headers).status_code == 204

    r = client.post("/auth/register", json={"username": "back", "email": "TestUser@Example.com", "password": "password"})
    assert r.status_code == 201
    assert r.json()["returning_trial_days"] == 10
    returning = db.query(User).filter(User.username == "back").one()
    assert access_state(returning) == TRIAL
    assert returning.trial_ends_at < datetime.now() + timedelta(days=11)

    r = client.post("/auth/register", json={"username": "fresh", "email": "fresh@example.com", "password": "password"})
    assert r.json()["returning_trial_days"] is None


def test_a_returning_email_after_the_trial_starts_locked(client, auth, db):
    """Deleted after the free month, or while paying, the email gets no trial back and the new account is locked at once."""
    headers = auth()
    user = db.query(User).one()
    user.trial_ends_at = datetime.now() - timedelta(days=5)
    db.commit()
    assert client.request("DELETE", "/auth/me", json={"password": "password"}, headers=headers).status_code == 204

    r = client.post("/auth/register", json={"username": "back", "email": "testuser@example.com", "password": "password"})
    assert r.json()["returning_trial_days"] == 0
    returning_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=returning_headers).json()["code"] == "subscription_required"


def test_an_email_changed_away_from_gets_no_new_trial(client, auth, db):
    """Once the new address is verified, the old one counts as having had its free month."""
    headers = auth()
    user = db.query(User).one()
    assert client.post("/auth/change-email", json={"email": "moved@example.com", "password": "password"}, headers=headers).status_code == 200
    token = create_purpose_token(user.id, "verify", timedelta(hours=1))
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200

    r = client.post("/auth/register", json={"username": "old", "email": "testuser@example.com", "password": "password"})
    assert r.json()["returning_trial_days"] == 0


def test_fingerprints_are_forgotten_after_a_year(client, db):
    """An expired fingerprint no longer counts at signup, and the daily purge erases it."""
    db.add(TrialFingerprint(email_hash=email_hash("old@example.com"), days_left=0, reason="deleted", expires_at=datetime.now() - timedelta(days=1)))
    db.commit()
    r = client.post("/auth/register", json={"username": "old", "email": "old@example.com", "password": "password"})
    assert r.json()["returning_trial_days"] is None
    assert purge_expired_fingerprints(db) == 1
