import hmac

from config import settings
from database import get_db
from fastapi import APIRouter, Depends, Header
from models.models import User
from sqlalchemy.orm import Session
from utils.billing import sync_premium
from utils.exceptions import ServiceUnavailableException, UnauthorizedException

# No lockout dependency here: a locked account must still be able to subscribe.
router = APIRouter(prefix="/billing", tags=["Billing"])


# RevenueCat calls this on every purchase, renewal, cancellation, billing problem, refund and transfer.
@router.post("/revenuecat", status_code=204, include_in_schema=False)
def revenuecat_webhook(payload: dict, authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Re-read every account the event names from RevenueCat instead of interpreting the event, as RevenueCat recommends, so a duplicate or out of order delivery is harmless."""
    expected = settings.REVENUECAT_WEBHOOK_AUTH
    if not expected or not hmac.compare_digest(authorization or "", expected):
        raise UnauthorizedException("Invalid webhook authorization.", code="invalid_webhook")

    event = payload.get("event", {})
    # A transfer, such as a purchase restored onto a new account, names its accounts only in transferred_from and transferred_to.
    named = {event.get("app_user_id"), event.get("original_app_user_id"), *event.get("aliases", []), *event.get("transferred_from", []), *event.get("transferred_to", [])}
    # Anonymous RevenueCat IDs never match an account. Ours are the numeric user id.
    for user_id in sorted(str(i) for i in named if i and str(i).isdigit()):
        user = db.get(User, int(user_id))
        if user and not sync_premium(db, user):
            # A 5xx makes RevenueCat retry later, up to five times
            raise ServiceUnavailableException("RevenueCat could not be reached.", code="billing_unavailable")