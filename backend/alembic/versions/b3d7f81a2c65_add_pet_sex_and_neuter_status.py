"""add pet sex and neuter status

Revision ID: b3d7f81a2c65
Revises: a1f4c2e79b30
Create Date: 2026-09-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b3d7f81a2c65'
down_revision: Union[str, Sequence[str], None] = 'a1f4c2e79b30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Plain columns, no enum, so this one is genuinely reversible.
    op.add_column('pets', sa.Column('sex', sa.String(length=10), nullable=True))
    op.add_column('pets', sa.Column('neutered', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('pets', 'neutered')
    op.drop_column('pets', 'sex')