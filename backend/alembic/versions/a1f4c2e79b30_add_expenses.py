"""add per-pet expenses and the monthly budget limit

Revision ID: a1f4c2e79b30
Revises: d8e3f5a1c704
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1f4c2e79b30'
down_revision: Union[str, Sequence[str], None] = 'd8e3f5a1c704'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """The expense log, and the per-pet limit it is measured against."""
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pet_id', sa.Integer(), nullable=False),
        sa.Column('record_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('category', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['record_id'], ['health_records.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_expenses_id'), 'expenses', ['id'], unique=False)
    op.create_index(op.f('ix_expenses_pet_id'), 'expenses', ['pet_id'], unique=False)
    op.create_index(op.f('ix_expenses_date'), 'expenses', ['date'], unique=False)

    op.add_column('pets', sa.Column('monthly_budget', sa.Float(), nullable=True))


def downgrade() -> None:
    """Genuinely reversible — nothing here is an enum."""
    op.drop_column('pets', 'monthly_budget')
    op.drop_index(op.f('ix_expenses_date'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_pet_id'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_id'), table_name='expenses')
    op.drop_table('expenses')