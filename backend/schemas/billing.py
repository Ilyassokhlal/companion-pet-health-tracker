from typing import Literal

from pydantic import BaseModel, Field


# Schemas for the billing endpoints
class CheckoutRequest(BaseModel):
    """Schema for starting a web checkout"""
    plan: Literal["monthly", "yearly"] = Field(
        description="Which Companion Premium plan to buy.",
        examples=["yearly"])