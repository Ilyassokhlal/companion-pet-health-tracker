"""warn before access ends

Revision ID: a4e8c2f71d35
Revises: f3c9d1a7b264
Create Date: 2026-10-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a4e8c2f71d35'
down_revision: Union[str, Sequence[str], None] = 'f3c9d1a7b264'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remember whether a purchase renews, and widen the trial warning marker to any access that is about to end."""
    op.add_column('users', sa.Column('premium_renews', sa.Boolean(), nullable=True))
    op.alter_column('users', 'trial_warning_sent', new_column_name='lock_warning_sent')


def downgrade() -> None:
    """Back to trial warnings only."""
    op.alter_column('users', 'lock_warning_sent', new_column_name='trial_warning_sent')
    op.drop_column('users', 'premium_renews')
