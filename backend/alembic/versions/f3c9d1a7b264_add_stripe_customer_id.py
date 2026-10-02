"""add stripe customer id

Revision ID: f3c9d1a7b264
Revises: e7b31c5a9d08
Create Date: 2026-10-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f3c9d1a7b264'
down_revision: Union[str, Sequence[str], None] = 'e7b31c5a9d08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remember the Stripe customer behind a web subscription."""
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Forget the Stripe customer."""
    op.drop_column('users', 'stripe_customer_id')