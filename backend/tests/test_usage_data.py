"""What the admin dashboard reads: activity days, countries, each question's outcome and tokens, and billing events."""

from datetime import timedelta
from types import SimpleNamespace

import pytest
import rag
from config import settings
from models.models import ActivityDay, BillingEvent, QuestionUsage, User
from utils import activity, geo


@pytest.fixture(autouse=True)
def fresh_activity_memory(monkeypatch):
    """Every test starts its account ids at 1, so the process memory of today's activity starts empty too."""
    monkeypatch.setattr(activity, "_seen", set())


def test_each_day_and_app_is_recorded_once(client, auth, db):
    """The first signed-in request of the day per app writes a row. An app that doesn't name itself counts as unknown."""
    headers = auth()
    for client_name in ("android", "android", "web", None, "something else"):
        extra = {"X-Client": client_name} if client_name else {}
        assert client.get("/auth/me", headers=headers | extra).status_code == 200

    rows = db.query(ActivityDay).all()
    assert sorted(r.platform for r in rows) == ["android", "unknown", "web"]
    assert {r.day for r in rows} == {activity.today()}


def test_activity_older_than_13_months_is_deleted(client, auth, db):
    """The daily clean up keeps 13 months of activity."""
    auth()
    user_id = db.query(User).one().id
    db.add_all([
        ActivityDay(user_id=user_id, day=activity.today() - timedelta(days=400), platform="web"),
        ActivityDay(user_id=user_id, day=activity.today() - timedelta(days=10), platform="web"),
    ])
    db.commit()
    assert activity.purge_old_activity(db) == 1
    assert [r.day for r in db.query(ActivityDay)] == [activity.today() - timedelta(days=10)]


def test_signup_and_login_keep_the_country(client, db, monkeypatch):
    """Signup records the country of the address, each login updates it, and a login from an unknown address keeps the last one."""
    countries = iter(["FR", "TW", None])
    monkeypatch.setattr("routers.auth.request_country", lambda request: next(countries))

    client.post("/auth/register", json={"username": "traveller", "email": "traveller@example.com", "password": "password"}).raise_for_status()
    user = db.query(User).one()
    assert user.country == "FR"
    for expected in ("TW", "TW"):
        client.post("/auth/login", json={"email": "traveller@example.com", "password": "password"}).raise_for_status()
        db.refresh(user)
        assert user.country == expected


def test_only_a_public_address_has_a_country(monkeypatch):
    """Private, local and malformed addresses never reach the database. A public one gets its two letter code."""
    looked_up = []
    reader = SimpleNamespace(get=lambda address: looked_up.append(address) or {"country": {"iso_code": "US"}})
    monkeypatch.setattr(geo, "_reader", lambda: reader)

    assert geo.country_for("8.8.8.8") == "US"
    for address in ("10.0.0.5", "127.0.0.1", "172.18.0.1", "::1", "not an address", "", None):
        assert geo.country_for(address) is None
    assert looked_up == ["8.8.8.8"]

    # Without the database every address is unknown
    monkeypatch.setattr(geo, "_reader", lambda: None)
    assert geo.country_for("8.8.8.8") is None


def test_a_refused_question_keeps_its_outcome_and_tokens(client, pet, db, monkeypatch):
    """A question refused as out of scope still counts the translation's tokens, against the model that answered."""
    headers, pet_data = pet

    def translate(question, fallback, pet_name, species, usage=None):
        usage.add(SimpleNamespace(input_tokens=120, output_tokens=30))
        return question, "en", None

    monkeypatch.setattr("rag.translate_question", translate)
    monkeypatch.setattr("rag.retrieve", lambda *args, **kwargs: [])
    r = client.post("/ask", json={"pet_id": pet_data["id"], "question": "What is the capital of France?"}, headers=headers)
    assert r.status_code == 200

    tally = db.query(QuestionUsage).one()
    assert (tally.answered, tally.input_tokens, tally.output_tokens, tally.model) == (False, 120, 30, settings.MODEL_NAME)


def test_an_answer_adds_its_tokens_to_the_translations(client, pet, db, monkeypatch):
    """The streamed answer's tokens are added once it is complete, so the dashboard shows the real cost of both calls."""
    headers, pet_data = pet

    def translate(question, fallback, pet_name, species, usage=None):
        usage.add(SimpleNamespace(input_tokens=100, output_tokens=20))
        return question, "en", None

    def generate(messages, lang=None, usage=None):
        yield "Kennel "
        yield "cough."
        usage.add(SimpleNamespace(input_tokens=2000, output_tokens=150))

    chunk = rag.SourceChunk(text="Kennel cough is a contagious respiratory infection.", source="dogs.txt", distance=0.2, title="Dogs")
    monkeypatch.setattr("rag.translate_question", translate)
    monkeypatch.setattr("rag.retrieve", lambda *args, **kwargs: [chunk])
    monkeypatch.setattr("rag.generate", generate)
    r = client.post("/ask", json={"pet_id": pet_data["id"], "question": "Why is my cat coughing?"}, headers=headers)
    assert r.status_code == 200
    assert "Kennel " in r.text

    tally = db.query(QuestionUsage).one()
    db.refresh(tally)
    assert (tally.answered, tally.input_tokens, tally.output_tokens) == (True, 2100, 170)


def test_revenuecat_events_are_kept_once(client, auth, db, monkeypatch):
    """Each event is kept with its store, prices and account, once even when delivered again, and even when the account can't be re-read."""
    auth()
    user = db.query(User).one()
    monkeypatch.setattr(settings, "REVENUECAT_WEBHOOK_AUTH", "Bearer test-webhook")
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: None)
    hook = {"Authorization": "Bearer test-webhook"}
    purchase = {
        "id": "evt-1", "type": "INITIAL_PURCHASE", "store": "PLAY_STORE", "environment": "PRODUCTION",
        "product_id": "companion_monthly", "app_user_id": str(user.id), "price": 4.99,
        "price_in_purchased_currency": 4.59, "currency": "EUR", "tax_percentage": 0.2,
        "commission_percentage": 0.15, "event_timestamp_ms": 1_800_000_000_000,
    }

    # RevenueCat unreachable: the 503 asks for a retry, and the retry doesn't add the event twice
    for _ in range(2):
        assert client.post("/billing/revenuecat", json={"event": purchase}, headers=hook).status_code == 503
    refund = {"id": "evt-2", "type": "CANCELLATION", "store": "PLAY_STORE", "environment": "PRODUCTION",
              "app_user_id": "$RCAnonymousID:abc", "price": -4.99, "cancel_reason": "CUSTOMER_SUPPORT"}
    client.post("/billing/revenuecat", json={"event": refund}, headers=hook)

    events = {e.event_id: e for e in db.query(BillingEvent)}
    assert set(events) == {"evt-1", "evt-2"}
    kept = events["evt-1"]
    assert (kept.user_id, kept.store, kept.price_usd, kept.price_local, kept.currency) == (user.id, "PLAY_STORE", 4.99, 4.59, "EUR")
    assert (kept.tax_percentage, kept.commission_percentage, kept.occurred_at is not None) == (0.2, 0.15, True)
    assert (events["evt-2"].user_id, events["evt-2"].price_usd, events["evt-2"].cancel_reason) == (None, -4.99, "CUSTOMER_SUPPORT")
