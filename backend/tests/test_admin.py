"""The owner's admin commands: ban, unban, grant, revoke, delete and the action log."""

from datetime import date, datetime, timedelta, timezone

import admin
import pytest
from models.models import AdminAction, User
from utils import admin as actions
from utils.access import has_full_access
from utils.reminders import send_lock_warnings


def _verified(db) -> User:
    user = db.query(User).one()
    user.email_verified = True
    db.commit()
    return user


def test_a_ban_ends_live_sessions_and_blocks_sign_in_and_signup(client, auth, db, no_email):
    """The live token stops working at once, signing in says the account is suspended (only with the right password), and the email can't sign up again."""
    headers = auth()
    _verified(db)
    no_email.clear()

    assert actions.ban(db, "TestUser@Example.com", "Spam") == []

    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 403
    assert r.json()["code"] == "account_suspended"
    r = client.post("/auth/login", json={"email": "testuser@example.com", "password": "password"})
    assert (r.status_code, r.json()["code"]) == (403, "account_suspended")
    r = client.post("/auth/login", json={"email": "testuser@example.com", "password": "wrongpassword"})
    assert r.json()["code"] == "invalid_credentials"
    r = client.post("/auth/register", json={"username": "again", "email": "TESTUSER@example.com", "password": "password"})
    assert (r.status_code, r.json()["code"]) == (403, "account_suspended")

    # The fixed message goes out, never the reason
    assert [m["subject"] for m in no_email] == ["Your Companion account has been suspended"]
    assert "Spam" not in no_email[0]["html"]
    entry = db.query(AdminAction).one()
    assert (entry.action, entry.email, entry.reason, entry.detail) == ("ban", "testuser@example.com", "Spam", None)

    with pytest.raises(actions.AdminError):
        actions.ban(db, "testuser@example.com")


def test_a_ban_goes_ahead_when_a_renewal_cannot_be_stopped(client, auth, db, monkeypatch):
    """A payment outage never holds up a ban: the account is suspended and the owner is told what to cancel by hand."""
    auth()
    user = db.query(User).one()
    user.premium_source = "purchased"
    user.premium_expires_at = datetime.now() + timedelta(days=20)
    user.stripe_customer_id = "cus_test"
    db.commit()
    monkeypatch.setattr("utils.admin.cancel_renewals", lambda user: False)

    warnings = actions.ban(db, "testuser@example.com")

    assert any("cus_test" in w for w in warnings)
    assert any(f"RevenueCat customer {user.id}" in w for w in warnings)
    db.refresh(user)
    assert user.banned_at is not None
    assert db.query(AdminAction).one().detail == "renewal not stopped"


def test_banned_accounts_get_no_reminders_or_lock_warnings(client, auth, db):
    """Suspended accounts drop out of the reminder jobs, and are never told they are about to lock."""
    auth()
    user = db.query(User).one()
    user.timezone = "UTC"
    six = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0)
    user.trial_ends_at = six.astimezone().replace(tzinfo=None) + timedelta(days=2, hours=12)
    db.commit()
    actions.ban(db, "testuser@example.com")

    assert not has_full_access(user)
    assert send_lock_warnings(db, six) == 0
    # The same account is warned once the ban is lifted
    actions.unban(db, "testuser@example.com")
    assert send_lock_warnings(db, six) == 1


def test_unban_lifts_the_ban_even_after_the_account_is_deleted(client, auth, db):
    """Delete only takes banned accounts. The deleted account's email stays blocked until unban, and the log keeps the email."""
    headers = auth()
    with pytest.raises(actions.AdminError):
        actions.delete(db, "testuser@example.com")
    assert client.get("/auth/me", headers=headers).status_code == 200

    actions.ban(db, "testuser@example.com")
    actions.delete(db, "testuser@example.com", "Gone")
    assert db.query(User).count() == 0
    r = client.post("/auth/register", json={"username": "again", "email": "testuser@example.com", "password": "password"})
    assert r.status_code == 403

    actions.unban(db, "testuser@example.com")
    r = client.post("/auth/register", json={"username": "again", "email": "testuser@example.com", "password": "password"})
    assert r.status_code == 201

    log = actions.recent_actions(db, "testuser@example.com")
    assert [e.action for e in log] == ["unban", "delete", "ban"]
    assert all(e.email == "testuser@example.com" and e.user_id is None for e in log)


def test_unban_brings_the_account_back(client, auth, db):
    """An unbanned account signs in again with its data where it was."""
    auth()
    actions.ban(db, "testuser@example.com")
    actions.unban(db, "testuser@example.com", "Appealed")
    r = client.post("/auth/login", json={"email": "testuser@example.com", "password": "password"})
    assert r.status_code == 200
    with pytest.raises(actions.AdminError):
        actions.unban(db, "testuser@example.com")


def test_grant_gives_premium_for_life_or_through_a_date(client, auth, db, no_email):
    """A grant shows as granted access, emails a verified owner, and an end date runs through the end of that day."""
    headers = auth()
    user = _verified(db)
    no_email.clear()

    assert actions.grant(db, "testuser@example.com", reason="Tester") == []
    assert client.get("/auth/me", headers=headers).json()["access"] == "granted"
    assert no_email[-1]["subject"] == "You have Companion Premium"
    assert "for life" in no_email[-1]["html"]

    until = date.today() + timedelta(days=10)
    actions.grant(db, "testuser@example.com", until)
    db.refresh(user)
    assert user.premium_expires_at == datetime.combine(until + timedelta(days=1), datetime.min.time())
    assert until.isoformat() in no_email[-1]["html"]
    assert [e.detail for e in actions.recent_actions(db)] == [f"until {until.isoformat()}", "lifetime"]

    with pytest.raises(actions.AdminError):
        actions.grant(db, "testuser@example.com", date.today() - timedelta(days=1))
    with pytest.raises(actions.AdminError):
        actions.grant(db, "nobody@example.com")


def test_revoke_takes_back_grants_only(client, auth, db):
    """Revoking falls back to the free month. A store purchase is refunded in the store, not revoked here."""
    headers = auth()
    actions.grant(db, "testuser@example.com")
    actions.revoke(db, "testuser@example.com")
    assert client.get("/auth/me", headers=headers).json()["access"] == "trial"
    with pytest.raises(actions.AdminError):
        actions.revoke(db, "testuser@example.com")

    user = db.query(User).one()
    user.premium_source = "purchased"
    user.premium_expires_at = datetime.now() + timedelta(days=20)
    db.commit()
    with pytest.raises(actions.AdminError):
        actions.revoke(db, "testuser@example.com")


def test_the_command_line(client, auth, capsys):
    """Each command prints what it did, refusals change nothing and exit 1, and log lists the actions."""
    auth()

    assert admin.main(["grant", "testuser@example.com", "--until", "2030-01-31", "--reason", "Play review"]) == 0
    assert "Done: grant testuser@example.com" in capsys.readouterr().out

    assert admin.main(["delete", "testuser@example.com"]) == 1
    assert "Nothing changed" in capsys.readouterr().err
    assert admin.main(["ban", "nobody@example.com"]) == 1
    capsys.readouterr()

    assert admin.main(["log"]) == 0
    line = capsys.readouterr().out.strip()
    assert line.endswith("grant  testuser@example.com  until 2030-01-31  Play review")
