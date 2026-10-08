from datetime import date

from pydantic import BaseModel, Field, field_validator

# The categories the Money dashboard groups fixed costs by. Claude, Google Play and Stripe are added on their own.
CATEGORIES = ("hosting", "email", "domains", "app_stores", "tools", "other")
PERIODS = ("monthly", "yearly", "once")


def _choice(value: str, choices: tuple[str, ...], what: str) -> str:
    """Accept what the form's free text field holds, such as "App stores", as the stored code app_stores."""
    code = value.strip().lower().replace(" ", "_")
    if code not in choices:
        raise ValueError(f"{what} must be one of: {', '.join(c.replace('_', ' ') for c in choices)}")
    return code


class CostAdd(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str
    amount_usd: float = Field(gt=0, le=1_000_000)
    period: str
    starts_on: date

    @field_validator("category")
    @classmethod
    def known_category(cls, value: str) -> str:
        return _choice(value, CATEGORIES, "Category")

    @field_validator("period")
    @classmethod
    def known_period(cls, value: str) -> str:
        return _choice(value, PERIODS, "Period")


class CostChange(BaseModel):
    amount_usd: float = Field(gt=0, le=1_000_000)
    from_date: date


class CostEnd(BaseModel):
    ends_on: date
