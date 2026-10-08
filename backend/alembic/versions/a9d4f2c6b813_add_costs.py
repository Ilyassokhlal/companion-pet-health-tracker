"""add costs

Revision ID: a9d4f2c6b813
Revises: e4a1b8c35d72
Create Date: 2026-10-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a9d4f2c6b813'
down_revision: Union[str, Sequence[str], None] = 'e4a1b8c35d72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The dashboard's role runs in the owner's timezone, so its "today" is the owner's day. Stored times are UTC, so the
# plan compares them with the current UTC time rather than the session's local time.
USERS_VIEW = """
CREATE VIEW stats.users AS
SELECT id, email, username, created_at, language, country, banned_at, trial_ends_at,
       premium_source, premium_expires_at, premium_renews,
       CASE
           WHEN banned_at IS NOT NULL THEN 'banned'
           WHEN premium_source = 'granted' AND (premium_expires_at IS NULL OR premium_expires_at > {now}) THEN 'granted'
           WHEN premium_source = 'purchased' AND premium_expires_at > {now} THEN 'premium'
           WHEN trial_ends_at > {now} THEN 'trial'
           ELSE 'locked'
       END AS plan
FROM public.users
"""

# Claude's price per million tokens, from Anthropic's price list (2026-09-25). A model missing here shows no cost:
# add it, or change a price, with a new migration.
VIEWS = """
CREATE VIEW stats.costs AS
SELECT id, name, category, amount_usd, period, starts_on, ends_on FROM public.costs;

CREATE VIEW stats.stripe_fees AS
SELECT transaction_id, type, environment, fee, currency, description, occurred_at FROM public.stripe_fees;

CREATE VIEW stats.model_prices AS
SELECT * FROM (VALUES
    ('claude-haiku-4-5', 1.00, 5.00),
    ('claude-sonnet-4-6', 3.00, 15.00),
    ('claude-sonnet-5', 2.00, 10.00),
    ('claude-sonnet-5-5', 2.00, 10.00),
    ('claude-opus-4-6', 5.00, 25.00),
    ('claude-opus-4-7', 5.00, 25.00),
    ('claude-opus-4-8', 5.00, 25.00),
    ('claude-opus-5', 5.00, 25.00),
    ('claude-opus-5-5', 4.00, 20.00),
    ('claude-fable-5', 10.00, 50.00),
    ('claude-fable-5-1', 10.00, 50.00)
) AS prices (model, input_usd_per_mtok, output_usd_per_mtok);

CREATE VIEW stats.question_costs AS
SELECT q.user_id, q.created_at, q.answered, q.input_tokens, q.output_tokens, q.model,
       (q.input_tokens * p.input_usd_per_mtok + q.output_tokens * p.output_usd_per_mtok) / 1000000.0 AS cost_usd
FROM stats.questions q
LEFT JOIN stats.model_prices p ON p.model = regexp_replace(q.model, '-[0-9]{8}$', '')
"""


def _run(sql: str) -> None:
    # One statement at a time: the database driver takes a single command per call
    for statement in sql.split(";"):
        if statement.strip():
            op.execute(statement)


def upgrade() -> None:
    """Add the costs the owner types in and the fees read from Stripe, and their stats views."""
    op.create_table(
        'costs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=20), nullable=False),
        sa.Column('amount_usd', sa.Float(), nullable=False),
        sa.Column('period', sa.String(length=10), nullable=False),
        sa.Column('starts_on', sa.Date(), nullable=False),
        sa.Column('ends_on', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_costs_id'), 'costs', ['id'], unique=False)
    op.create_table(
        'stripe_fees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.String(length=64), nullable=False),
        sa.Column('type', sa.String(length=40), nullable=False),
        sa.Column('environment', sa.String(length=12), nullable=False),
        sa.Column('fee', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id'),
    )
    op.create_index(op.f('ix_stripe_fees_id'), 'stripe_fees', ['id'], unique=False)
    op.create_index(op.f('ix_stripe_fees_occurred_at'), 'stripe_fees', ['occurred_at'], unique=False)
    op.execute("DROP VIEW stats.users")
    op.execute(USERS_VIEW.format(now="(now() AT TIME ZONE 'UTC')"))
    _run(VIEWS)


def downgrade() -> None:
    """Remove the costs, the Stripe fees and their views, and put the users view back as it was."""
    for view in ("question_costs", "model_prices", "stripe_fees", "costs"):
        op.execute(f"DROP VIEW stats.{view}")
    op.execute("DROP VIEW stats.users")
    op.execute(USERS_VIEW.format(now="LOCALTIMESTAMP"))
    op.drop_index(op.f('ix_stripe_fees_occurred_at'), table_name='stripe_fees')
    op.drop_index(op.f('ix_stripe_fees_id'), table_name='stripe_fees')
    op.drop_table('stripe_fees')
    op.drop_index(op.f('ix_costs_id'), table_name='costs')
    op.drop_table('costs')
