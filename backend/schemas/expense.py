from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Fixed categories for expenses. These are stored as stable lowercase tokens rather than display text.
CATEGORIES = ("food", "vet", "medication", "grooming", "supplies", "insurance", "other")


class ExpenseCreate(BaseModel):
    """Log a single expense against a pet."""
    date: date_type
    amount: float = Field(gt=0, description="What was spent, in the owner's currency.", examples=[45.5])
    category: str = Field(description="One of the seven fixed categories.", examples=["vet"])
    record_id: int | None = Field(
        default=None,
        description="A health record this cost belongs to, so a vet visit carries its price.",
        examples=[3])
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("category")
    @classmethod
    def _known_category(cls, value: str) -> str:
        if value not in CATEGORIES:
            raise ValueError(f"Category must be one of {', '.join(CATEGORIES)}.")
        return value


class ExpenseUpdate(BaseModel):
    """Edit a logged expense. Currency is absent on purpose — it is stamped once, at write time."""
    date: date_type | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = None
    record_id: int | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("date", "amount", "category")
    @classmethod
    def _no_explicit_null(cls, value):
        """These three back NOT NULL columns. Sending an explicit null must be a 422, not a 500 from
        Postgres — the fourth time an optional-vs-required mismatch would have bitten this project."""
        if value is None:
            raise ValueError("This field cannot be cleared.")
        return value

    @field_validator("category")
    @classmethod
    def _known_category(cls, value: str | None) -> str | None:
        if value is not None and value not in CATEGORIES:
            raise ValueError(f"Category must be one of {', '.join(CATEGORIES)}.")
        return value


class ExpenseResponse(BaseModel):
    """Response model for a logged expense."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    record_id: int | None
    date: date_type
    amount: float
    currency: str
    category: str
    notes: str | None
    created_at: datetime


class CategoryTotal(BaseModel):
    """What one category cost over the summarised month."""
    category: str
    total: float


class ExpenseSummary(BaseModel):
    """A month's spending for one pet, measured against its limit."""
    month: str = Field(description="The summarised month.", examples=["2026-08"])
    total: float
    currency: str
    limit: float | None
    percent: float | None = Field(
        default=None,
        description="Spend as a percentage of the limit, or null when no limit is set.",
        examples=[85.0])
    status: str = Field(description="One of none, ok, warning, over.", examples=["warning"])
    by_category: list[CategoryTotal]
    currencies: list[str] = Field(
        description="Every currency present in the month. More than one means the total is a raw sum.")