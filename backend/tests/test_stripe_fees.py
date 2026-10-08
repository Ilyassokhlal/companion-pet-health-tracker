"""Exact Stripe fees, read from the account's balance transactions."""

from types import SimpleNamespace

import stripe
from config import settings
from models.models import StripeFee
from utils.stripe_fees import sync_stripe_fees


def _txn(txn_id, type_, amount, fee=0, created=1_790_000_000):
    return SimpleNamespace(id=txn_id, type=type_, amount=amount, fee=fee, currency="usd", description=f"{type_} {txn_id}", created=created)


TRANSACTIONS = [
    _txn("txn_charge", "charge", 499, fee=45),
    _txn("txn_refund", "refund", -499),
    _txn("txn_billing", "stripe_fee", -35),
    _txn("txn_fx", "stripe_fx_fee", -12),
    _txn("txn_tax", "tax_fee", -3),
    _txn("txn_credit", "stripe_fee", 20),
    _txn("txn_payout", "payout", -5000),
]


def _stripe(monkeypatch, transactions, calls):
    def list_(params):
        calls.append(params)
        return SimpleNamespace(auto_paging_iter=lambda: iter(transactions))

    client = SimpleNamespace(v1=SimpleNamespace(balance_transactions=SimpleNamespace(list=list_)))
    monkeypatch.setattr("utils.stripe_fees.stripe_client", lambda: client)


def test_every_fee_stripe_kept_is_read_once(client, db, monkeypatch):
    """A payment's fee, Stripe's own charges and a fee given back are kept. Movements that cost nothing are not."""
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")
    calls = []
    _stripe(monkeypatch, TRANSACTIONS, calls)

    assert sync_stripe_fees(db) == 5
    fees = {f.transaction_id: f for f in db.query(StripeFee)}
    assert {k: v.fee for k, v in fees.items()} == {"txn_charge": 0.45, "txn_billing": 0.35, "txn_fx": 0.12, "txn_tax": 0.03, "txn_credit": -0.2}
    assert {f.environment for f in fees.values()} == {"SANDBOX"}
    assert "created" not in calls[0]

    # The next run reads from a little before the latest fee, and keeps nothing twice
    assert sync_stripe_fees(db) == 0
    assert calls[1]["created"]["gte"] == 1_790_000_000 - 2 * 86_400
    assert db.query(StripeFee).count() == 5


def test_a_live_key_marks_production_and_no_key_reads_nothing(client, db, monkeypatch):
    calls = []
    _stripe(monkeypatch, TRANSACTIONS[:1], calls)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "")
    assert sync_stripe_fees(db) == 0
    assert calls == []

    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_live_x")
    assert sync_stripe_fees(db) == 1
    assert db.query(StripeFee).one().environment == "PRODUCTION"


def test_an_unreachable_stripe_keeps_nothing(client, db, monkeypatch):
    """The run gives up without a half written day, and the next one catches up."""
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")

    def broken():
        yield _txn("txn_charge", "charge", 499, fee=45)
        raise stripe.APIConnectionError("down")

    client_ = SimpleNamespace(v1=SimpleNamespace(balance_transactions=SimpleNamespace(list=lambda params: SimpleNamespace(auto_paging_iter=broken))))
    monkeypatch.setattr("utils.stripe_fees.stripe_client", lambda: client_)
    assert sync_stripe_fees(db) == 0
    assert db.query(StripeFee).count() == 0
