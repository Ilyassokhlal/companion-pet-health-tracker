from calendar import monthrange
from datetime import date as date_type
from datetime import datetime
from zoneinfo import ZoneInfo

from database import get_db
from fastapi import APIRouter, Depends, Response
from models.models import Expense, HealthRecord, Pet, User
from schemas.expense import (
    CategoryTotal,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseSummary,
    ExpenseUpdate,
)
from sqlalchemy.orm import Session
from utils.exceptions import BadRequestException, NotFoundException
from utils.security import get_current_user

router = APIRouter(tags=["Budget"])

# Threshold for triggering a warning when a pet's spending approaches its monthly budget.
WARNING_RATIO = 0.8


def _get_owned_pet(pet_id: int, db: Session, current_user: User) -> Pet:
    """Retrieve a pet owned by the current user, or raise a NotFoundException if it doesn't exist."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


def _get_owned_expense(expense_id: int, db: Session, current_user: User) -> Expense:
    """Retrieve an expense owned by the current user, or raise a NotFoundException if it doesn't exist."""
    row = db.query(Expense).join(Pet).filter(Expense.id == expense_id, Pet.user_id == current_user.id).first()
    if not row:
        raise NotFoundException("Expense", expense_id)
    return row


def _checked_record_id(record_id: int | None, pet: Pet, db: Session) -> int | None:
    """Check that a health record belongs to the given pet and return its ID, or None if not provided."""
    if record_id is None:
        return None
    record = (
        db.query(HealthRecord)
        .filter(HealthRecord.id == record_id, HealthRecord.pet_id == pet.id)
        .first()
    )
    if not record:
        raise NotFoundException("Health record", record_id)
    return record.id


def _month_bounds(month: str) -> tuple[date_type, date_type]:
    """Get the first and last day of a given YYYY-MM month."""
    parts = month.split("-")
    if len(parts) != 2 or len(parts[0]) != 4 or len(parts[1]) != 2 or not all(p.isdigit() for p in parts):
        raise BadRequestException("Month must be formatted as YYYY-MM.", code="bad_month")
    year, index = int(parts[0]), int(parts[1])
    if not 1 <= index <= 12:
        raise BadRequestException("Month must be formatted as YYYY-MM.", code="bad_month")
    first = date_type(year, index, 1)
    return first, first.replace(day=monthrange(year, index)[1])


@router.get("/pets/{pet_id}/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    pet_id: int,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List a pet's expenses for the current user, optionally filtered by a specific month."""
    pet = _get_owned_pet(pet_id, db, current_user)
    query = db.query(Expense).filter(Expense.pet_id == pet.id)
    if month is not None:
        first, last = _month_bounds(month)
        query = query.filter(Expense.date >= first, Expense.date <= last)
    return query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()


@router.post("/pets/{pet_id}/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(
    pet_id: int,
    request: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a new expense for the current user. The currency is stamped from the owner's setting and never converted afterwards."""
    pet = _get_owned_pet(pet_id, db, current_user)
    payload = request.model_dump()
    payload["record_id"] = _checked_record_id(payload["record_id"], pet, db)
    row = Expense(pet_id=pet.id, currency=current_user.currency, **payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    request: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a logged expense for the current user."""
    row = _get_owned_expense(expense_id, db, current_user)
    changes = request.model_dump(exclude_unset=True)
    if "record_id" in changes:
        changes["record_id"] = _checked_record_id(changes["record_id"], row.pet, db)
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a logged expense for the current user."""
    row = _get_owned_expense(expense_id, db, current_user)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.get("/pets/{pet_id}/expense-summary", response_model=ExpenseSummary)
def expense_summary(
    pet_id: int,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a summary of a pet's expenses for a given month.

    Returns a summary of the pet's expenses for the specified month, including total spending, 
    spending by category, and comparison against the pet's monthly budget."""

    pet = _get_owned_pet(pet_id, db, current_user)
    if month is None:
        month = datetime.now(ZoneInfo(current_user.timezone or "UTC")).strftime("%Y-%m")
    first, last = _month_bounds(month)

    rows = (
        db.query(Expense)
        .filter(Expense.pet_id == pet.id, Expense.date >= first, Expense.date <= last)
        .all()
    )
    total = round(sum(row.amount for row in rows), 2)

    totals: dict[str, float] = {}
    for row in rows:
        totals[row.category] = totals.get(row.category, 0.0) + row.amount
    by_category = [
        CategoryTotal(category=name, total=round(value, 2))
        for name, value in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]

    limit = pet.monthly_budget
    percent = round(total / limit * 100, 1) if limit else None
    if not limit:
        status = "none"
    elif total >= limit:
        status = "over"
    elif total >= limit * WARNING_RATIO:
        status = "warning"
    else:
        status = "ok"

    return ExpenseSummary(
        month=month,
        total=total,
        currency=rows[0].currency if rows else current_user.currency,
        limit=limit,
        percent=percent,
        status=status,
        by_category=by_category,
        currencies=sorted({row.currency for row in rows}),
    )