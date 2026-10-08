"""The admin dashboard's fixed costs form. Grafana's buttons send here through the secret path: Caddy's password prompt
stands in front, and Caddy adds the gate header only on that route. Without it every endpoint answers 404, as if it
didn't exist, so the public /api can't reach them.

The form's fields arrive in the address rather than as JSON: Grafana pastes typed text into a body as it is, so a quote
in a name would break it, while it encodes each address field."""

import hmac
from datetime import timedelta
from typing import Annotated

from config import settings
from database import get_db
from fastapi import APIRouter, Depends, Header, Query
from models.models import Cost
from schemas.costs import CostAdd, CostChange, CostEnd
from sqlalchemy.orm import Session
from utils.exceptions import AppException, BadRequestException, ForbiddenException, NotFoundException


def require_gate(x_stats_gate: str | None = Header(default=None), x_requested_by: str | None = Header(default=None)) -> None:
    """Only requests that came through Caddy's secret path, and that the browser sent with Grafana's custom header.

    A custom header can't be sent from another site without the browser asking first, so a page elsewhere can't make
    the owner's browser change a cost."""
    secret = settings.STATS_GATE_SECRET
    if not secret or not x_stats_gate or not hmac.compare_digest(x_stats_gate, secret):
        raise AppException("Not Found", status_code=404, code="not_found")
    if x_requested_by != "grafana":
        raise ForbiddenException("Costs can only be changed from the admin dashboard.", code="forbidden")


router = APIRouter(prefix="/stats-gate/costs", include_in_schema=False, dependencies=[Depends(require_gate)])


def _cost(db: Session, cost_id: int) -> Cost:
    cost = db.get(Cost, cost_id)
    if cost is None:
        raise NotFoundException("Cost", cost_id)
    return cost


@router.post("/add", status_code=201)
def add_cost(payload: Annotated[CostAdd, Query()], db: Session = Depends(get_db)) -> dict:
    """A new running or one off cost."""
    cost = Cost(**payload.model_dump())
    db.add(cost)
    db.commit()
    return {"id": cost.id}


@router.post("/{cost_id}/change", status_code=201)
def change_cost(cost_id: int, payload: Annotated[CostChange, Query()], db: Session = Depends(get_db)) -> dict:
    """A new amount from a date on. The old amount ends the day before, so earlier months keep what was paid. From
    the cost's own first day, the amount is simply corrected, since no month has used the old one."""
    cost = _cost(db, cost_id)
    if cost.period == "once":
        raise BadRequestException("A one off cost can't change. Remove it and add the right one.", code="bad_request")
    if cost.ends_on is not None and payload.from_date > cost.ends_on:
        raise BadRequestException("That cost had already ended by then.", code="bad_request")
    if payload.from_date <= cost.starts_on:
        cost.amount_usd = payload.amount_usd
        db.commit()
        return {"id": cost.id}
    new = Cost(
        name=cost.name, category=cost.category, amount_usd=payload.amount_usd, period=cost.period,
        starts_on=payload.from_date, ends_on=cost.ends_on,
    )
    cost.ends_on = payload.from_date - timedelta(days=1)
    db.add(new)
    db.commit()
    return {"id": new.id}


@router.post("/{cost_id}/end")
def end_cost(cost_id: int, payload: Annotated[CostEnd, Query()], db: Session = Depends(get_db)) -> dict:
    """The last day a running cost counts, such as when a plan is cancelled."""
    cost = _cost(db, cost_id)
    if cost.period == "once":
        raise BadRequestException("A one off cost has nothing to end. Remove it if it was a mistake.", code="bad_request")
    if payload.ends_on < cost.starts_on:
        raise BadRequestException("A cost can't end before it starts. Remove it if it was a mistake.", code="bad_request")
    cost.ends_on = payload.ends_on
    db.commit()
    return {"id": cost.id}


@router.post("/{cost_id}/remove")
def remove_cost(cost_id: int, db: Session = Depends(get_db)) -> dict:
    """Delete an entry made by mistake. Real changes go through change and end, which keep the history."""
    db.delete(_cost(db, cost_id))
    db.commit()
    return {"id": cost_id}
