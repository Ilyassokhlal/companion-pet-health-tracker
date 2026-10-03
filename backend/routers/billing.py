import hmac

import stripe
from config import settings
from database import get_db
from fastapi import APIRouter, Depends, Header, Request
from models.models import User
from schemas.billing import CheckoutRequest
from schemas.user import UserResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from utils.access import PREMIUM, access_state
from utils.billing import report_stripe_purchase, running_stripe_subscriptions, stripe_client, sync_premium
from utils.exceptions import BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException
from utils.limiter import limiter
from utils.security import get_current_user

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


# Web purchases use Stripe's hosted checkout page, so card details never reach this server.
@router.post("/checkout")
def create_checkout(payload: CheckoutRequest, current_user: User = Depends(get_current_user)):
    """Start a Stripe checkout for Companion Premium and return the URL to send the user to."""
    if access_state(current_user) == PREMIUM:
        raise BadRequestException("This account already has Companion Premium.", code="already_premium")
    price = settings.STRIPE_PRICE_MONTHLY if payload.plan == "monthly" else settings.STRIPE_PRICE_YEARLY
    params = {
        "mode": "subscription",
        "line_items": [{"price": price, "quantity": 1}],
        "client_reference_id": str(current_user.id),
        "automatic_tax": {"enabled": True},
        "success_url": f"{settings.FRONTEND_URL}/premium?checkout=success",
        "cancel_url": f"{settings.FRONTEND_URL}/premium?checkout=cancelled",
    }
    if current_user.stripe_customer_id:
        params["customer"] = current_user.stripe_customer_id
        # Stripe Tax needs the customer's address. Checkout collects it and saves it back to the customer.
        params["customer_update"] = {"address": "auto"}
    else:
        params["customer_email"] = current_user.email
    session = stripe_client().v1.checkout.sessions.create(params=params)
    return {"url": session.url}


# Managing or cancelling a web subscription happens on Stripe's hosted billing portal. Phone subscriptions are managed in the store.
@router.post("/portal")
def create_portal(current_user: User = Depends(get_current_user)):
    """Open Stripe's billing portal for the account's web subscription and return its URL."""
    if not current_user.stripe_customer_id:
        raise BadRequestException("This account has no web subscription to manage.", code="no_web_subscription")
    session = stripe_client().v1.billing_portal.sessions.create(
        params={"customer": current_user.stripe_customer_id, "return_url": f"{settings.FRONTEND_URL}/premium"}
    )
    return {"url": session.url}

# A web payer who deleted their account and came back gets the subscription that is still running. Phone purchases are restored by the app through the store.
@router.post("/restore", status_code=204)
@limiter.limit("5/hour")
def restore_purchase(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Find a running web subscription paid with this account's email and move it onto this account."""
    if not current_user.email_verified:
        # Anyone can sign up with any address, so only a verified one can claim the subscription paid with it.
        raise ForbiddenException("Verify your email to restore a purchase.", code="email_not_verified")
    found = None
    try:
        for customer_id, subscription_id in running_stripe_subscriptions(current_user.email):
            owner = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            # Never move a subscription away from another account that still exists
            if owner is None or owner.id == current_user.id:
                found = customer_id, subscription_id
                break
    except stripe.StripeError as e:
        raise ServiceUnavailableException("Stripe could not be reached.", code="billing_unavailable") from e
    if found is None:
        raise BadRequestException("No web subscription was found for this email.", code="nothing_to_restore")
    customer_id, subscription_id = found
    # RevenueCat moves the subscription from the deleted account's id to this one
    if not report_stripe_purchase(str(current_user.id), subscription_id):
        raise ServiceUnavailableException("RevenueCat could not be reached.", code="billing_unavailable")
    current_user.stripe_customer_id = customer_id
    db.commit()
    sync_premium(db, current_user)


# The app calls this straight after a store purchase or restore, so premium shows at once instead of when the webhook arrives.
@router.post("/sync", response_model=UserResponse)
@limiter.limit("10/minute")
def sync_purchases(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Re-read this account from RevenueCat and return it."""
    if not sync_premium(db, current_user):
        raise ServiceUnavailableException("RevenueCat could not be reached.", code="billing_unavailable")
    db.refresh(current_user)
    return current_user


def _record_checkout(db: Session, checkout) -> None:
    """Save the Stripe customer on the account, report the subscription to RevenueCat, then sync premium straight away."""
    user_id = checkout.get("client_reference_id")
    subscription_id = checkout.get("subscription")
    if not (user_id and str(user_id).isdigit() and subscription_id):
        return
    user = db.get(User, int(user_id))
    if user is None:
        return
    user.stripe_customer_id = checkout.get("customer")
    db.commit()
    if not report_stripe_purchase(str(user.id), subscription_id):
        # A 5xx makes Stripe retry the webhook later
        raise ServiceUnavailableException("RevenueCat could not be reached.", code="billing_unavailable")
    sync_premium(db, user)


# Stripe calls this when a web checkout completes. From then on RevenueCat tracks the subscription through its own Stripe connection.
@router.post("/stripe", include_in_schema=False)
async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Verify Stripe's signature on the raw body, then hand a completed checkout over to RevenueCat."""
    payload = await request.body()
    try:
        event = stripe_client().construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError) as e:
        raise BadRequestException("Invalid Stripe signature.", code="invalid_webhook") from e
    if event["type"] == "checkout.session.completed":
        # Stripe objects stopped being dicts in stripe-python 13, so hand over a plain dict
        await run_in_threadpool(_record_checkout, db, event["data"]["object"].to_dict())
    return {"received": True}