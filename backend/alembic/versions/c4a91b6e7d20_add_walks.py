"""add walks and walk tracking columns

Revision ID: c4a91b6e7d20
Revises: b7f2c1a4d3e5
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4a91b6e7d20'
down_revision: Union[str, Sequence[str], None] = 'b7f2c1a4d3e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the walks table and the account/pet walk tracking switches."""
    op.create_table(
        'walks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pet_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_walks_id'), 'walks', ['id'], unique=False)
    op.create_index(op.f('ix_walks_pet_id'), 'walks', ['pet_id'], unique=False)
    op.create_index(op.f('ix_walks_date'), 'walks', ['date'], unique=False)
    op.add_column('users', sa.Column('walk_tracking_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('pets', sa.Column('walk_tracking_enabled', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Remove the walks table and the account/pet tracking switches."""
    op.drop_column('pets', 'walk_tracking_enabled')
    op.drop_column('users', 'walk_tracking_enabled')
    op.drop_index(op.f('ix_walks_date'), table_name='walks')
    op.drop_index(op.f('ix_walks_pet_id'), table_name='walks')
    op.drop_index(op.f('ix_walks_id'), table_name='walks')
    op.drop_table('walks')