import logging
from collections.abc import Iterator
from datetime import datetime

import httpx
import stripe
from config import settings
from models.models import User
from sqlalchemy.orm import Session
from stripe import StripeClient

logger = logging.getLogger(__name__)

REVENUECAT_API = "https://api.revenuecat.com/v1"

# Stripe subscription states that are paid up and will renew, and states still chasing an unpaid invoice
_STRIPE_PAID = ("active", "trialing")
_STRIPE_UNPAID = ("past_due", "unpaid", "incomplete")


def _parse(value: str | None) -> datetime | None:
    """RevenueCat sends ISO 8601 dates in UTC. Stored timestamps are naive server time, so convert to that."""
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone().replace(tzinfo=None)


def _access_ends(item: dict) -> datetime | None:
    """When an entitlement or subscription stops giving access. During a billing grace period the store keeps retrying the payment, and access lasts until the later of the two dates."""
    ends = [d for d in (_parse(item.get("expires_date")), _parse(item.get("grace_period_expires_date"))) if d]
    return max(ends) if ends else None


def _revenuecat_headers() -> dict:
    return {"Authorization": f"Bearer {settings.REVENUECAT_SECRET_KEY}"}


def fetch_subscriber(app_user_id: str) -> dict | None:
    """Return the account as RevenueCat sees it, or None when RevenueCat can't be reached."""
    try:
        r = httpx.get(f"{REVENUECAT_API}/subscribers/{app_user_id}", headers=_revenuecat_headers(), timeout=15)
        r.raise_for_status()
    except httpx.HTTPError:
        logger.warning("RevenueCat lookup failed for user %s", app_user_id, exc_info=True)
        return None
    return r.json()["subscriber"]


def fetch_entitlement(app_user_id: str) -> dict | None:
    """Return the account's premium entitlement as RevenueCat sees it, an empty dict when there is none, or None when RevenueCat can't be reached."""
    subscriber = fetch_subscriber(app_user_id)
    if subscriber is None:
        return None
    entitlement = subscriber["entitlements"].get(settings.REVENUECAT_ENTITLEMENT, {})
    if entitlement:
        # The entitlement doesn't say whether it renews. The subscription behind it does.
        subscription = subscriber.get("subscriptions", {}).get(entitlement.get("product_identifier"), {})
        entitlement = {**entitlement, "unsubscribe_detected_at": subscription.get("unsubscribe_detected_at")}
    return entitlement


def apply_entitlement(user: User, entitlement: dict) -> None:
    """Mirror RevenueCat's premium entitlement onto the account. A lifetime grant from the command line is never overwritten."""
    if user.premium_source == "granted" and user.premium_expires_at is None:
        return
    if entitlement and entitlement.get("expires_date") is None:
        # A non-expiring entitlement, such as a lifetime promotional grant made in the RevenueCat dashboard
        user.premium_source = "granted"
        user.premium_expires_at = None
        return
    ends = _access_ends(entitlement)
    if ends is None:
        # No entitlement any more, after a refund or a revoke: a purchase ends now. A timed grant is left to run out on its own.
        if user.premium_source == "purchased":
            user.premium_expires_at = datetime.now()
        return
    renews = not entitlement.get("unsubscribe_detected_at")
    # A purchase, a renewal or a plan switched back on starts a new period, so its warnings can go out again
    if renews or ends != user.premium_expires_at:
        user.lock_warning_sent = None
    user.premium_source = "purchased"
    user.premium_expires_at = ends
    user.premium_renews = renews


def sync_premium(db: Session, user: User) -> bool:
    """Bring the account's premium fields in line with RevenueCat. Returns False and changes nothing when RevenueCat can't be reached, so an outage never locks anyone out."""
    entitlement = fetch_entitlement(str(user.id))
    if entitlement is None:
        return False
    apply_entitlement(user, entitlement)
    db.commit()
    return True


def resync_purchased(db: Session) -> int:
    """Daily safety net for a lost webhook: re-read every account with a purchase on record. Returns how many were synced."""
    users = db.query(User).filter(User.premium_source == "purchased").all()
    return sum(sync_premium(db, user) for user in users)


def stripe_client() -> StripeClient:
    """A Stripe API client, made per call so it always uses the current key."""
    return StripeClient(settings.STRIPE_SECRET_KEY)


def report_stripe_purchase(app_user_id: str, subscription_id: str) -> bool:
    """Tell RevenueCat about a subscription bought through Stripe, so it tracks it for this account from now on. Returns False when RevenueCat can't be reached."""
    try:
        r = httpx.post(
            f"{REVENUECAT_API}/receipts",
            headers={"X-Platform": "stripe", "Authorization": f"Bearer {settings.REVENUECAT_STRIPE_PUBLIC_KEY}"},
            json={"app_user_id": app_user_id, "fetch_token": subscription_id},
            timeout=15,
        )
        r.raise_for_status()
    except httpx.HTTPError:
        logger.warning("Reporting Stripe subscription %s to RevenueCat failed", subscription_id, exc_info=True)
        return False
    return True


def cancel_stripe_renewal(customer_id: str) -> bool:
    """Stop the web subscription from renewing. A paid period runs to its end, so a returning account can still restore it. One with an unpaid invoice ends now. Returns False when Stripe can't be reached."""
    client = stripe_client()
    try:
        for sub in client.v1.subscriptions.list(params={"customer": customer_id, "status": "all"}).auto_paging_iter():
            if sub.status in _STRIPE_PAID and not sub.cancel_at_period_end:
                client.v1.subscriptions.update(sub.id, params={"cancel_at_period_end": True})
            elif sub.status in _STRIPE_UNPAID:
                client.v1.subscriptions.cancel(sub.id)
    except stripe.StripeError:
        logger.warning("Stopping the Stripe renewal failed for customer %s", customer_id, exc_info=True)
        return False
    return True


def cancel_google_renewals(app_user_id: str) -> bool:
    """Stop every Google Play subscription on the account from renewing. Access runs to the end of the paid period. Returns False when RevenueCat can't be reached."""
    subscriber = fetch_subscriber(app_user_id)
    if subscriber is None:
        return False
    for sub in subscriber.get("subscriptions", {}).values():
        ends = _access_ends(sub)
        renewing = not (sub.get("unsubscribe_detected_at") or sub.get("refunded_at") or (ends and ends < datetime.now()))
        if sub.get("store") != "play_store" or not renewing:
            continue
        try:
            r = httpx.post(
                f"{REVENUECAT_API}/subscribers/{app_user_id}/subscriptions/{sub['store_transaction_id']}/cancel",
                headers=_revenuecat_headers(),
                timeout=15,
            )
            r.raise_for_status()
        except httpx.HTTPError:
            logger.warning("Stopping a Google Play renewal failed for user %s", app_user_id, exc_info=True)
            return False
    return True


def cancel_renewals(user: User) -> bool:
    """Before an account is deleted: stop its web and Google Play subscriptions from renewing, so nobody is charged for an account that no longer exists.

    Apple allows no developer cancel, so an iOS subscription will need the user to cancel it in their Apple settings.
    Returns False when Stripe or RevenueCat can't be reached. Running it again is safe."""
    if user.stripe_customer_id and not cancel_stripe_renewal(user.stripe_customer_id):
        return False
    # Only an account with a purchase on record can have a store subscription, so free accounts never wait on RevenueCat.
    return user.premium_source != "purchased" or cancel_google_renewals(str(user.id))


def running_stripe_subscriptions(email: str) -> Iterator[tuple[str, str]]:
    """Every running web subscription paid with this email, as (customer id, subscription id). Stripe matches the email exactly, upper and lower case included.

    Raises stripe.StripeError when Stripe can't be reached."""
    client = stripe_client()
    for customer in client.v1.customers.list(params={"email": email}).auto_paging_iter():
        for sub in client.v1.subscriptions.list(params={"customer": customer.id}).auto_paging_iter():
            if sub.status in (*_STRIPE_PAID, "past_due"):
                yield customer.id, sub.id