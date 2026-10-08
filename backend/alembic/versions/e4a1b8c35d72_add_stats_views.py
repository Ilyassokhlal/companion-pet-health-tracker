"""add stats views

Revision ID: e4a1b8c35d72
Revises: c7d2e9a41f5b
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e4a1b8c35d72'
down_revision: Union[str, Sequence[str], None] = 'c7d2e9a41f5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Everything the admin dashboard can read. Grafana's role sees these views and nothing else: accounts by email and
# username, dates and counts, never a pet's name, a record's contents, a photo or a chat. A later migration that changes
# a column one of these views reads has to drop and recreate the view around it.
VIEWS = """
CREATE SCHEMA IF NOT EXISTS stats;

CREATE VIEW stats.users AS
SELECT id, email, username, created_at, language, country, banned_at, trial_ends_at,
       premium_source, premium_expires_at, premium_renews,
       CASE
           WHEN banned_at IS NOT NULL THEN 'banned'
           WHEN premium_source = 'granted' AND (premium_expires_at IS NULL OR premium_expires_at > LOCALTIMESTAMP) THEN 'granted'
           WHEN premium_source = 'purchased' AND premium_expires_at > LOCALTIMESTAMP THEN 'premium'
           WHEN trial_ends_at > LOCALTIMESTAMP THEN 'trial'
           ELSE 'locked'
       END AS plan
FROM public.users;

CREATE VIEW stats.activity_days AS
SELECT user_id, day, platform, first_seen FROM public.activity_days;

CREATE VIEW stats.questions AS
SELECT user_id, created_at, answered, input_tokens, output_tokens, model FROM public.question_usage;

CREATE VIEW stats.onboarding_steps AS
SELECT user_id, step, done_at FROM public.onboarding_steps;

CREATE VIEW stats.billing_events AS
SELECT event_id, type, store, environment, product_id, user_id, price_usd, price_local, currency,
       tax_percentage, commission_percentage, cancel_reason, occurred_at, received_at
FROM public.billing_events;

CREATE VIEW stats.admin_actions AS
SELECT id, created_at, action, user_id, email, reason, detail FROM public.admin_actions;

CREATE VIEW stats.pets AS
SELECT id, user_id, species, created_at FROM public.pets;

CREATE VIEW stats.records AS
SELECT p.user_id, r.record_type::text AS record_type, r.created_at
FROM public.health_records r JOIN public.pets p ON p.id = r.pet_id;

CREATE VIEW stats.photos AS
SELECT p.user_id, ph.created_at
FROM public.record_photos ph JOIN public.health_records r ON r.id = ph.record_id JOIN public.pets p ON p.id = r.pet_id;

CREATE VIEW stats.walks AS
SELECT p.user_id, w.created_at FROM public.walks w JOIN public.pets p ON p.id = w.pet_id;

CREATE VIEW stats.feedings AS
SELECT p.user_id, f.created_at FROM public.feedings f JOIN public.pets p ON p.id = f.pet_id;
"""


def upgrade() -> None:
    """Add the stats schema, the only thing the admin dashboard's read only role can see."""
    # One statement at a time: the database driver takes a single command per call
    for statement in VIEWS.split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade() -> None:
    """Remove the stats schema and its views."""
    op.execute("DROP SCHEMA IF EXISTS stats CASCADE")
