"""add usage data

Revision ID: c7d2e9a41f5b
Revises: 8b4f1e2d6c90
Create Date: 2026-10-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c7d2e9a41f5b'
down_revision: Union[str, Sequence[str], None] = '8b4f1e2d6c90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add what the admin dashboard reads: activity days, billing events, each account's country, and each question's outcome and tokens."""
    op.add_column('users', sa.Column('country', sa.String(length=2), nullable=True))
    op.add_column('question_usage', sa.Column('answered', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('question_usage', sa.Column('input_tokens', sa.Integer(), server_default='0', nullable=False))
    op.add_column('question_usage', sa.Column('output_tokens', sa.Integer(), server_default='0', nullable=False))
    op.add_column('question_usage', sa.Column('model', sa.String(length=50), nullable=True))
    op.create_table(
        'activity_days',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('platform', sa.String(length=10), nullable=False),
        sa.Column('first_seen', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'day', 'platform'),
    )
    op.create_index(op.f('ix_activity_days_id'), 'activity_days', ['id'], unique=False)
    op.create_index(op.f('ix_activity_days_user_id'), 'activity_days', ['user_id'], unique=False)
    op.create_index(op.f('ix_activity_days_day'), 'activity_days', ['day'], unique=False)
    op.create_table(
        'billing_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('type', sa.String(length=40), nullable=False),
        sa.Column('store', sa.String(length=20), nullable=True),
        sa.Column('environment', sa.String(length=12), nullable=True),
        sa.Column('product_id', sa.String(length=100), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('price_usd', sa.Float(), nullable=True),
        sa.Column('price_local', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('tax_percentage', sa.Float(), nullable=True),
        sa.Column('commission_percentage', sa.Float(), nullable=True),
        sa.Column('cancel_reason', sa.String(length=40), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id'),
    )
    op.create_index(op.f('ix_billing_events_id'), 'billing_events', ['id'], unique=False)
    op.create_index(op.f('ix_billing_events_user_id'), 'billing_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_billing_events_occurred_at'), 'billing_events', ['occurred_at'], unique=False)


def downgrade() -> None:
    """Remove the admin dashboard's usage data."""
    op.drop_index(op.f('ix_billing_events_occurred_at'), table_name='billing_events')
    op.drop_index(op.f('ix_billing_events_user_id'), table_name='billing_events')
    op.drop_index(op.f('ix_billing_events_id'), table_name='billing_events')
    op.drop_table('billing_events')
    op.drop_index(op.f('ix_activity_days_day'), table_name='activity_days')
    op.drop_index(op.f('ix_activity_days_user_id'), table_name='activity_days')
    op.drop_index(op.f('ix_activity_days_id'), table_name='activity_days')
    op.drop_table('activity_days')
    op.drop_column('question_usage', 'model')
    op.drop_column('question_usage', 'output_tokens')
    op.drop_column('question_usage', 'input_tokens')
    op.drop_column('question_usage', 'answered')
    op.drop_column('users', 'country')
