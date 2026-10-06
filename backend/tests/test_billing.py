"""Payments: RevenueCat, Stripe, and stopping renewals when a paying account is deleted."""

from datetime import datetime, timedelta
from types import SimpleNamespace

import stripe
from config import settings
from models.models import User
from utils.access import GRANTED, LOCKED, PREMIUM, access_state
from utils.billing import apply_entitlement, fetch_entitlement


def test_revenuecat_webhook_syncs_premium_from_revenuecat(client, auth, db, monkeypatch):
    """The webhook re-reads the account from RevenueCat instead of trusting the event, and rejects calls without the configured header."""
    auth()
    user = db.query(User).one()
    monkeypatch.setattr(settings, "REVENUECAT_WEBHOOK_AUTH", "Bearer test-webhook")
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: {"expires_date": "2030-01-01T00:00:00Z", "grace_period_expires_date": None})
    body = {"api_version": "1.0", "event": {"type": "INITIAL_PURCHASE", "app_user_id": str(user.id), "aliases": [str(user.id)]}}

    assert client.post("/billing/revenuecat", json=body).status_code == 401
    assert client.post("/billing/revenuecat", json=body, headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.post("/billing/revenuecat", json=body, headers={"Authorization": "Bearer test-webhook"}).status_code == 204
    db.refresh(user)
    assert user.premium_source == "purchased"
    assert access_state(user) == PREMIUM

    # When RevenueCat can't be reached nothing changes, and the 503 makes RevenueCat retry later
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: None)
    assert client.post("/billing/revenuecat", json=body, headers={"Authorization": "Bearer test-webhook"}).status_code == 503
    db.refresh(user)
    assert access_state(user) == PREMIUM


def test_entitlement_mirrors_revenuecat_without_overriding_lifetime_grants():
    """Grace keeps a purchase open, a refund ends it at once, and a lifetime grant from the command line is never touched."""
    def account(**fields):
        return SimpleNamespace(**{"trial_ends_at": datetime.now() - timedelta(days=60), "premium_source": None, "premium_expires_at": None} | fields)

    buyer = account()
    apply_entitlement(buyer, {"expires_date": "2020-01-01T00:00:00Z", "grace_period_expires_date": "2099-01-01T00:00:00Z"})
    assert buyer.premium_source == "purchased"
    assert access_state(buyer) == PREMIUM

    apply_entitlement(buyer, {})
    assert access_state(buyer) == LOCKED

    lifetime = account(premium_source="granted")
    apply_entitlement(lifetime, {})
    apply_entitlement(lifetime, {"expires_date": "2020-01-01T00:00:00Z"})
    assert access_state(lifetime) == GRANTED


def test_checkout_opens_stripe_even_for_a_locked_account(client, auth, db, monkeypatch):
    """A locked account must be able to subscribe. The session carries the account id, the chosen price and Stripe Tax."""
    headers = auth()
    user = db.query(User).one()
    user.trial_ends_at = datetime.now() - timedelta(days=1)
    db.commit()
    monkeypatch.setattr(settings, "STRIPE_PRICE_YEARLY", "price_yearly")
    created = []

    def create(params):
        created.append(params)
        return SimpleNamespace(url="https://checkout.stripe.test/session")

    fake = SimpleNamespace(v1=SimpleNamespace(checkout=SimpleNamespace(sessions=SimpleNamespace(create=create))))
    monkeypatch.setattr("routers.billing.stripe_client", lambda: fake)

    r = client.post("/billing/checkout", json={"plan": "yearly"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["url"] == "https://checkout.stripe.test/session"
    assert created[0]["line_items"] == [{"price": "price_yearly", "quantity": 1}]
    assert created[0]["client_reference_id"] == str(user.id)
    assert created[0]["customer_email"] == user.email
    assert created[0]["automatic_tax"] == {"enabled": True}

    assert client.post("/billing/checkout", json={"plan": "weekly"}, headers=headers).status_code == 422
    assert client.post("/billing/portal", headers=headers).json()["code"] == "no_web_subscription"

    # Someone already paying can't start a second subscription
    user.premium_source = "purchased"
    user.premium_expires_at = datetime.now() + timedelta(days=30)
    db.commit()
    assert client.post("/billing/checkout", json={"plan": "monthly"}, headers=headers).json()["code"] == "already_premium"


def test_stripe_webhook_hands_the_purchase_to_revenuecat(client, auth, db, monkeypatch):
    """A completed checkout saves the Stripe customer and reports the subscription to RevenueCat. A bad signature is refused."""
    auth()
    user = db.query(User).one()
    # A real Stripe object, as construct_event returns it. Since stripe-python 13 these are not dicts, so .get() on them fails.
    event = stripe.Event.construct_from(
        {"type": "checkout.session.completed", "data": {"object": {"client_reference_id": str(user.id), "customer": "cus_test", "subscription": "sub_test"}}},
        "sk_test_unused",
    )

    def construct_event(payload, signature, secret):
        if signature != "good":
            raise stripe.SignatureVerificationError("bad signature", signature)
        return event

    monkeypatch.setattr("routers.billing.stripe_client", lambda: SimpleNamespace(construct_event=construct_event))
    reported = []
    monkeypatch.setattr("routers.billing.report_stripe_purchase", lambda app_user_id, subscription_id: reported.append((app_user_id, subscription_id)) or True)
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: {"expires_date": "2030-01-01T00:00:00Z"})

    assert client.post("/billing/stripe", content=b"{}", headers={"Stripe-Signature": "forged"}).status_code == 400
    assert client.post("/billing/stripe", content=b"{}", headers={"Stripe-Signature": "good"}).status_code == 200
    assert reported == [(str(user.id), "sub_test")]
    db.refresh(user)
    assert user.stripe_customer_id == "cus_test"
    assert access_state(user) == PREMIUM

    # If RevenueCat can't be reached, the 503 makes Stripe retry later
    monkeypatch.setattr("routers.billing.report_stripe_purchase", lambda app_user_id, subscription_id: False)
    assert client.post("/billing/stripe", content=b"{}", headers={"Stripe-Signature": "good"}).status_code == 503


def test_renewal_comes_from_revenuecat_and_a_new_period_resets_the_warnings(monkeypatch):
    """Whether a purchase renews is read from the subscription behind the entitlement. Switching it back on clears the warnings sent."""
    subscriber = {
        "entitlements": {settings.REVENUECAT_ENTITLEMENT: {"expires_date": "2030-01-01T00:00:00Z", "product_identifier": "monthly"}},
        "subscriptions": {"monthly": {"unsubscribe_detected_at": "2029-12-01T00:00:00Z"}},
    }
    monkeypatch.setattr("utils.billing.fetch_subscriber", lambda app_user_id: subscriber)
    entitlement = fetch_entitlement("1")
    assert entitlement["unsubscribe_detected_at"] == "2029-12-01T00:00:00Z"

    user = SimpleNamespace(trial_ends_at=datetime.now() - timedelta(days=60), premium_source=None, premium_expires_at=None, lock_warning_sent=None)
    apply_entitlement(user, entitlement)
    assert user.premium_renews is False
    user.lock_warning_sent = 3
    apply_entitlement(user, entitlement)
    assert user.lock_warning_sent == 3
    apply_entitlement(user, {**entitlement, "unsubscribe_detected_at": None})
    assert user.premium_renews is True
    assert user.lock_warning_sent is None


def test_deleting_a_paying_account_stops_its_web_and_google_renewals(client, auth, db, monkeypatch):
    """Paid periods run out without renewing and an unpaid web invoice ends now. If a payment service can't be reached, nothing is deleted."""
    headers = auth()
    user = db.query(User).one()
    user.premium_source = "purchased"
    user.premium_expires_at = datetime.now() + timedelta(days=30)
    user.stripe_customer_id = "cus_test"
    db.commit()
    user_id = user.id

    web = [
        SimpleNamespace(id="sub_paid", status="active", cancel_at_period_end=False),
        SimpleNamespace(id="sub_unpaid", status="past_due", cancel_at_period_end=False),
        SimpleNamespace(id="sub_over", status="canceled", cancel_at_period_end=False),
    ]
    updated, cancelled = [], []
    subscriptions = SimpleNamespace(
        list=lambda params: SimpleNamespace(auto_paging_iter=lambda: iter(web)),
        update=lambda sub_id, params: updated.append((sub_id, params)),
        cancel=lambda sub_id: cancelled.append(sub_id),
    )
    monkeypatch.setattr("utils.billing.stripe_client", lambda: SimpleNamespace(v1=SimpleNamespace(subscriptions=subscriptions)))

    google = {
        "renewing": {"store": "play_store", "store_transaction_id": "GPA.1", "expires_date": "2030-01-01T00:00:00Z"},
        "stopped": {"store": "play_store", "store_transaction_id": "GPA.2", "expires_date": "2030-01-01T00:00:00Z", "unsubscribe_detected_at": "2026-01-01T00:00:00Z"},
        "expired": {"store": "play_store", "store_transaction_id": "GPA.3", "expires_date": "2020-01-01T00:00:00Z"},
        "web": {"store": "stripe", "store_transaction_id": "sub_paid", "expires_date": "2030-01-01T00:00:00Z"},
    }
    posted = []
    monkeypatch.setattr("utils.billing.httpx.post", lambda url, **kwargs: posted.append(url) or SimpleNamespace(raise_for_status=lambda: None))

    monkeypatch.setattr("utils.billing.fetch_subscriber", lambda app_user_id: None)
    r = client.request("DELETE", "/auth/me", json={"password": "password"}, headers=headers)
    assert r.status_code == 503
    assert r.json()["code"] == "renewal_not_stopped"
    assert db.query(User).count() == 1

    monkeypatch.setattr("utils.billing.fetch_subscriber", lambda app_user_id: {"subscriptions": google})
    assert client.request("DELETE", "/auth/me", json={"password": "password"}, headers=headers).status_code == 204
    assert ("sub_paid", {"cancel_at_period_end": True}) in updated
    assert {sub_id for sub_id, _ in updated} == {"sub_paid"}
    assert set(cancelled) == {"sub_unpaid"}
    assert posted == [f"https://api.revenuecat.com/v1/subscribers/{user_id}/subscriptions/GPA.1/cancel"]


def test_sync_brings_a_store_purchase_onto_the_account_at_once(client, auth, monkeypatch):
    """Straight after buying on the phone, the app asks the server to re-read RevenueCat instead of waiting for the webhook."""
    headers = auth()
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: {"expires_date": "2030-01-01T00:00:00Z"})
    r = client.post("/billing/sync", headers=headers)
    assert r.status_code == 200
    assert r.json()["access"] == "premium"

    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: None)
    assert client.post("/billing/sync", headers=headers).json()["code"] == "billing_unavailable"


def test_restore_moves_a_running_web_subscription_onto_a_returning_account(client, auth, db, monkeypatch):
    """Only a verified email can claim the subscription paid with it, and never one that another account still holds."""
    headers = auth()
    other = client.post("/auth/register", json={"username": "other", "email": "other@example.com", "password": "password"})
    assert other.status_code == 201
    db.query(User).filter(User.username == "other").one().stripe_customer_id = "cus_taken"
    user = db.query(User).filter(User.username == "testuser").one()
    db.commit()

    customers = [SimpleNamespace(id="cus_taken"), SimpleNamespace(id="cus_old")]
    asked = []

    def list_customers(params):
        asked.append(params["email"])
        return SimpleNamespace(auto_paging_iter=lambda: iter(customers))

    def list_subscriptions(params):
        return SimpleNamespace(auto_paging_iter=lambda: iter([SimpleNamespace(id=f"sub_of_{params['customer']}", status="active")]))

    fake = SimpleNamespace(v1=SimpleNamespace(customers=SimpleNamespace(list=list_customers), subscriptions=SimpleNamespace(list=list_subscriptions)))
    monkeypatch.setattr("utils.billing.stripe_client", lambda: fake)
    reported = []
    monkeypatch.setattr("routers.billing.report_stripe_purchase", lambda app_user_id, subscription_id: reported.append((app_user_id, subscription_id)) or True)
    monkeypatch.setattr("utils.billing.fetch_entitlement", lambda app_user_id: {"expires_date": "2030-01-01T00:00:00Z"})

    assert client.post("/billing/restore", headers=headers).json()["code"] == "email_not_verified"
    user.email_verified = True
    db.commit()

    assert client.post("/billing/restore", headers=headers).status_code == 204
    assert asked[-1] == "testuser@example.com"
    assert reported == [(str(user.id), "sub_of_cus_old")]
    db.refresh(user)
    assert user.stripe_customer_id == "cus_old"
    assert access_state(user) == PREMIUM

    customers.clear()
    assert client.post("/billing/restore", headers=headers).json()["code"] == "nothing_to_restore"

    def unreachable(params):
        raise stripe.APIConnectionError("Stripe is down")

    fake.v1.customers.list = unreachable
    assert client.post("/billing/restore", headers=headers).status_code == 503
