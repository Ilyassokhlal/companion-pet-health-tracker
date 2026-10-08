"""add bans and admin log

Revision ID: 8b4f1e2d6c90
Revises: 5d2a9c7e1f38
Create Date: 2026-10-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '8b4f1e2d6c90'
down_revision: Union[str, Sequence[str], None] = '5d2a9c7e1f38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add account bans, the banned email record and the admin action log."""
    op.add_column('users', sa.Column('banned_at', sa.DateTime(), nullable=True))
    op.create_table(
        'admin_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('detail', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_admin_actions_id'), 'admin_actions', ['id'], unique=False)
    op.create_index(op.f('ix_admin_actions_created_at'), 'admin_actions', ['created_at'], unique=False)
    op.create_index(op.f('ix_admin_actions_user_id'), 'admin_actions', ['user_id'], unique=False)
    op.create_table(
        'email_bans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_email_bans_id'), 'email_bans', ['id'], unique=False)
    op.create_index(op.f('ix_email_bans_email_hash'), 'email_bans', ['email_hash'], unique=True)


def downgrade() -> None:
    """Remove account bans, the banned email record and the admin action log."""
    op.drop_index(op.f('ix_email_bans_email_hash'), table_name='email_bans')
    op.drop_index(op.f('ix_email_bans_id'), table_name='email_bans')
    op.drop_table('email_bans')
    op.drop_index(op.f('ix_admin_actions_user_id'), table_name='admin_actions')
    op.drop_index(op.f('ix_admin_actions_created_at'), table_name='admin_actions')
    op.drop_index(op.f('ix_admin_actions_id'), table_name='admin_actions')
    op.drop_table('admin_actions')
    op.drop_column('users', 'banned_at')
