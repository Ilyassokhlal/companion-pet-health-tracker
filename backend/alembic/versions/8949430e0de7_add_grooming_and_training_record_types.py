"""add grooming and training record types

Revision ID: 8949430e0de7
Revises: 58aa610b2ce0
Create Date: 2026-08-27 11:28:29.962745

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '8949430e0de7'
down_revision: Union[str, Sequence[str], None] = '58aa610b2ce0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add grooming and training record types to the recordtype enum.

    The labels are the Python enum MEMBER NAMES, not their values — SQLAlchemy's Enum stores
    names by default, which is why the existing labels read VACCINATION rather than Vaccination.
    """
    op.execute("ALTER TYPE recordtype ADD VALUE IF NOT EXISTS 'GROOMING'")
    op.execute("ALTER TYPE recordtype ADD VALUE IF NOT EXISTS 'TRAINING'")


def downgrade() -> None:
    """Deliberately not reversible.

    Postgres cannot remove a label from an enum type. Undoing this would mean creating a
    replacement type, rewriting every health record onto it, swapping the column and dropping the
    old one and any row already using Grooming or Training would have nowhere to go.
    """
    raise NotImplementedError("Removing an enum label requires recreating recordtype.")
