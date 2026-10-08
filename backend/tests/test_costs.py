"""The admin dashboard's fixed costs form: only reachable with Caddy's gate secret, and changes keep the history."""

from datetime import date

import pytest
from config import settings
from models.models import Cost

GATE = {"X-Stats-Gate": "test-gate-secret", "X-Requested-By": "grafana"}


@pytest.fixture(autouse=True)
def gate_secret(monkeypatch):
    monkeypatch.setattr(settings, "STATS_GATE_SECRET", "test-gate-secret")


def _add(client, **fields):
    body = {"name": "Server", "category": "Hosting", "amount_usd": "12.50", "period": "monthly", "starts_on": "2026-01-01"} | fields
    r = client.post("/stats-gate/costs/add", params=body, headers=GATE)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_the_form_only_answers_through_the_secret_path(client, monkeypatch):
    """Without Caddy's gate header the endpoints don't exist, and the browser's custom header is required too."""
    body = {"name": "Server", "category": "hosting", "amount_usd": 12, "period": "monthly", "starts_on": "2026-01-01"}
    assert client.post("/stats-gate/costs/add", params=body).status_code == 404
    assert client.post("/stats-gate/costs/add", params=body, headers=GATE | {"X-Stats-Gate": "wrong"}).status_code == 404
    assert client.post("/stats-gate/costs/add", params=body, headers={"X-Stats-Gate": "test-gate-secret"}).status_code == 403

    # No secret configured: closed whatever is sent
    monkeypatch.setattr(settings, "STATS_GATE_SECRET", "")
    assert client.post("/stats-gate/costs/add", params=body, headers=GATE | {"X-Stats-Gate": ""}).status_code == 404


def test_a_cost_is_added_with_what_the_form_holds(client, db):
    """Free text from the form is read as the category and period codes, and anything else is refused with the choices.
    A name keeps whatever was typed, quotes included."""
    cost_id = _add(client, name='Google "Workspace" \\ team', category="App stores", period="Yearly")
    cost = db.get(Cost, cost_id)
    assert (cost.name, cost.category, cost.period, cost.amount_usd, cost.ends_on) == ('Google "Workspace" \\ team', "app_stores", "yearly", 12.5, None)

    r = client.post("/stats-gate/costs/add", params={"name": "X", "category": "Coffee", "amount_usd": 3, "period": "monthly", "starts_on": "2026-01-01"}, headers=GATE)
    assert r.status_code == 422
    assert "hosting, email, domains, app stores, tools, other" in r.text
    r = client.post("/stats-gate/costs/add", params={"name": "X", "category": "tools", "amount_usd": 0, "period": "monthly", "starts_on": "2026-01-01"}, headers=GATE)
    assert r.status_code == 422


def test_a_new_amount_keeps_what_earlier_months_paid(client, db):
    """The old amount ends the day before the new one starts. From the first day it is a plain correction."""
    cost_id = _add(client)
    r = client.post(f"/stats-gate/costs/{cost_id}/change", params={"amount_usd": 15, "from_date": "2026-06-01"}, headers=GATE)
    assert r.status_code == 201
    old, new = db.get(Cost, cost_id), db.get(Cost, r.json()["id"])
    assert (old.amount_usd, old.ends_on) == (12.5, date(2026, 5, 31))
    assert (new.name, new.category, new.amount_usd, new.starts_on, new.ends_on) == ("Server", "hosting", 15, date(2026, 6, 1), None)

    second = _add(client, name="Email")
    r = client.post(f"/stats-gate/costs/{second}/change", params={"amount_usd": 20, "from_date": "2026-01-01"}, headers=GATE)
    assert r.json()["id"] == second
    db.expire_all()
    assert db.get(Cost, second).amount_usd == 20

    # Once ended, a later amount is refused
    assert client.post(f"/stats-gate/costs/{cost_id}/change", params={"amount_usd": 9, "from_date": "2026-07-01"}, headers=GATE).status_code == 400


def test_ending_and_removing(client, db):
    """End records the last day of a running cost. One off costs can't end or change, only be removed as mistakes."""
    cost_id = _add(client)
    assert client.post(f"/stats-gate/costs/{cost_id}/end", params={"ends_on": "2025-12-31"}, headers=GATE).status_code == 400
    assert client.post(f"/stats-gate/costs/{cost_id}/end", params={"ends_on": "2026-09-30"}, headers=GATE).status_code == 200
    db.expire_all()
    assert db.get(Cost, cost_id).ends_on == date(2026, 9, 30)

    once = _add(client, name="Play developer account", category="app stores", amount_usd=25, period="once")
    assert client.post(f"/stats-gate/costs/{once}/end", params={"ends_on": "2026-02-01"}, headers=GATE).status_code == 400
    assert client.post(f"/stats-gate/costs/{once}/change", params={"amount_usd": 30, "from_date": "2026-02-01"}, headers=GATE).status_code == 400
    assert client.post(f"/stats-gate/costs/{once}/remove", headers=GATE).status_code == 200
    assert db.query(Cost).count() == 1
    assert client.post(f"/stats-gate/costs/{once}/remove", headers=GATE).status_code == 404
