import logging
from datetime import datetime

import httpx
from config import settings
from models.models import User
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

REVENUECAT_API = "https://api.revenuecat.com/v1"


def _parse(value: str | None) -> datetime | None:
    """RevenueCat sends ISO 8601 dates in UTC. Stored timestamps are naive server time, so convert to that."""
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone().replace(tzinfo=None)


def fetch_entitlement(app_user_id: str) -> dict | None:
    """Return the account's premium entitlement as RevenueCat sees it, an empty dict when there is none, or None when RevenueCat can't be reached."""
    try:
        r = httpx.get(
            f"{REVENUECAT_API}/subscribers/{app_user_id}",
            headers={"Authorization": f"Bearer {settings.REVENUECAT_SECRET_KEY}"},
            timeout=15,
        )
        r.raise_for_status()
    except httpx.HTTPError:
        logger.warning("RevenueCat lookup failed for user %s", app_user_id, exc_info=True)
        return None
    return r.json()["subscriber"]["entitlements"].get(settings.REVENUECAT_ENTITLEMENT, {})


def apply_entitlement(user: User, entitlement: dict) -> None:
    """Mirror RevenueCat's premium entitlement onto the account. A lifetime grant from the command line is never overwritten."""
    if user.premium_source == "granted" and user.premium_expires_at is None:
        return
    if entitlement and entitlement.get("expires_date") is None:
        # A non-expiring entitlement, such as a lifetime promotional grant made in the RevenueCat dashboard
        user.premium_source = "granted"
        user.premium_expires_at = None
        return
    # During a billing grace period the store keeps retrying the payment, and the account keeps access until the later of the two dates.
    ends = [d for d in (_parse(entitlement.get("expires_date")), _parse(entitlement.get("grace_period_expires_date"))) if d]
    if not ends:
        # No entitlement any more, after a refund or a revoke: a purchase ends now. A timed grant is left to run out on its own.
        if user.premium_source == "purchased":
            user.premium_expires_at = datetime.now()
        return
    user.premium_source = "purchased"
    user.premium_expires_at = max(ends)


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