"""Exact Stripe fees for the admin dashboard, read from the account's balance transactions once a day."""

import logging
from datetime import datetime, timedelta, timezone

import stripe
from config import settings
from models.models import StripeFee
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from utils.billing import stripe_client

logger = logging.getLogger(__name__)

# Stripe's own charges arrive as transactions of their own, with the cost as a negative amount: Billing, Tax and other
# product fees, currency conversion, and the tax on Stripe's fees. Every other transaction carries its fee in "fee".
OWN_CHARGES = ("stripe_fee", "stripe_fx_fee", "tax_fee")

# Each run reads again from a little before the latest fee kept, in case a transaction was still being settled
OVERLAP = timedelta(days=2)


def sync_stripe_fees(db: Session) -> int:
    """Daily: keep every Stripe fee since the last run, once each. Returns how many were added, and 0 without a key or
    when Stripe can't be reached (the next run catches up)."""
    key = settings.STRIPE_SECRET_KEY
    if not key:
        return 0
    environment = "PRODUCTION" if key.startswith(("sk_live_", "rk_live_")) else "SANDBOX"
    latest = db.query(func.max(StripeFee.occurred_at)).scalar()
    params: dict = {"limit": 100}
    if latest is not None:
        params["created"] = {"gte": int((latest - OVERLAP).replace(tzinfo=timezone.utc).timestamp())}

    added = 0
    try:
        for txn in stripe_client().v1.balance_transactions.list(params=params).auto_paging_iter():
            # In the smallest currency unit (cents), and positive for what Stripe kept
            cost = (txn.fee or 0) - (txn.amount if txn.type in OWN_CHARGES else 0)
            if cost == 0:
                continue
            result = db.execute(
                insert(StripeFee)
                .values(
                    transaction_id=txn.id,
                    type=txn.type,
                    environment=environment,
                    fee=cost / 100,
                    currency=txn.currency,
                    description=(txn.description or "")[:255] or None,
                    occurred_at=datetime.fromtimestamp(txn.created, timezone.utc).replace(tzinfo=None),
                )
                .on_conflict_do_nothing(index_elements=["transaction_id"])
                .returning(StripeFee.id)
            )
            # A row comes back only when the fee is new
            added += result.first() is not None
    except stripe.StripeError:
        logger.warning("Reading the Stripe fees failed", exc_info=True)
        db.rollback()
        return 0
    db.commit()
    return added
