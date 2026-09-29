"""add premium fields and trial fingerprints

Revision ID: c2f86d1e9a47
Revises: b3d7f81a2c65
Create Date: 2026-09-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c2f86d1e9a47'
down_revision: Union[str, Sequence[str], None] = 'b3d7f81a2c65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the premium fields, give every existing account lifetime premium, and add the trial fingerprints table."""
    # trial_ends_at is added empty, filled for every existing account, and only then made required.
    op.add_column('users', sa.Column('trial_ends_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('premium_source', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('premium_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('trial_warning_sent', sa.Integer(), nullable=True))
    # Every account that exists when this runs gets lifetime premium: the owner's circle and testers (decided 2026-09-26).
    op.execute("UPDATE users SET trial_ends_at = created_at + INTERVAL '30 days', premium_source = 'granted'")
    op.alter_column('users', 'trial_ends_at', nullable=False)

    op.create_table(
        'trial_fingerprints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email_hash', sa.String(length=64), nullable=False),
        sa.Column('days_left', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=20), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_trial_fingerprints_id'), 'trial_fingerprints', ['id'], unique=False)
    op.create_index(op.f('ix_trial_fingerprints_email_hash'), 'trial_fingerprints', ['email_hash'], unique=True)


def downgrade() -> None:
    """Remove the trial fingerprints table and the premium fields."""
    op.drop_index(op.f('ix_trial_fingerprints_email_hash'), table_name='trial_fingerprints')
    op.drop_index(op.f('ix_trial_fingerprints_id'), table_name='trial_fingerprints')
    op.drop_table('trial_fingerprints')
    op.drop_column('users', 'trial_warning_sent')
    op.drop_column('users', 'premium_expires_at')
    op.drop_column('users', 'premium_source')
    op.drop_column('users', 'trial_ends_at')