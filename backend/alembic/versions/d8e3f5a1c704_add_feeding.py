"""add feeding times, the feeding log and the feeding notification toggles

Revision ID: d8e3f5a1c704
Revises: c4a91b6e7d20
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd8e3f5a1c704'
down_revision: Union[str, Sequence[str], None] = 'c4a91b6e7d20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """The schedule, the log it is checked against, and its own notification switches."""
    op.create_table(
        'feeding_times',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pet_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.Time(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_feeding_times_id'), 'feeding_times', ['id'], unique=False)
    op.create_index(op.f('ix_feeding_times_pet_id'), 'feeding_times', ['pet_id'], unique=False)

    op.create_table(
        'feedings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pet_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.Time(), nullable=False),
        sa.Column('food', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('amount_unit', sa.String(length=10), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_feedings_id'), 'feedings', ['id'], unique=False)
    op.create_index(op.f('ix_feedings_pet_id'), 'feedings', ['pet_id'], unique=False)
    op.create_index(op.f('ix_feedings_date'), 'feedings', ['date'], unique=False)

    op.add_column('users', sa.Column('feeding_email_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('feeding_push_enabled', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Reversible — no enum members involved, unlike the record-type and event-kind migrations."""
    op.drop_column('users', 'feeding_push_enabled')
    op.drop_column('users', 'feeding_email_enabled')
    op.drop_index(op.f('ix_feedings_date'), table_name='feedings')
    op.drop_index(op.f('ix_feedings_pet_id'), table_name='feedings')
    op.drop_index(op.f('ix_feedings_id'), table_name='feedings')
    op.drop_table('feedings')
    op.drop_index(op.f('ix_feeding_times_pet_id'), table_name='feeding_times')
    op.drop_index(op.f('ix_feeding_times_id'), table_name='feeding_times')
    op.drop_table('feeding_times')