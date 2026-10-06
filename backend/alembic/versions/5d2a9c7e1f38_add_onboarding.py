"""add onboarding

Revision ID: 5d2a9c7e1f38
Revises: a4e8c2f71d35
Create Date: 2026-10-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5d2a9c7e1f38'
down_revision: Union[str, Sequence[str], None] = 'a4e8c2f71d35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Every Get started step an existing account already did, dated from the first time it happened.
# Questions asked before the question tally existed are found in the chat instead.
BACKFILL = """
INSERT INTO onboarding_steps (user_id, step, done_at)
SELECT user_id, 'pet', MIN(created_at) FROM pets GROUP BY user_id
UNION ALL
SELECT p.user_id, 'record', MIN(r.created_at)
FROM health_records r JOIN pets p ON p.id = r.pet_id GROUP BY p.user_id
UNION ALL
SELECT p.user_id, 'photo', MIN(ph.created_at)
FROM record_photos ph JOIN health_records r ON r.id = ph.record_id JOIN pets p ON p.id = r.pet_id GROUP BY p.user_id
UNION ALL
SELECT asked.user_id, 'question', MIN(asked.at) FROM (
    SELECT user_id, created_at AS at FROM question_usage
    UNION ALL
    SELECT p.user_id, m.created_at FROM chat_messages m JOIN pets p ON p.id = m.pet_id WHERE m.role = 'user'
) asked GROUP BY asked.user_id
UNION ALL
SELECT p.user_id, 'appointment', MIN(e.created_at)
FROM scheduled_events e JOIN pets p ON p.id = e.pet_id WHERE e.kind IN ('APPOINTMENT', 'RECORD_FOLLOWUP') GROUP BY p.user_id
"""


def upgrade() -> None:
    """Add the Get started steps and the switch that hides the card. Accounts that already exist start with the card hidden and their steps filled in."""
    op.create_table(
        'onboarding_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('step', sa.String(length=20), nullable=False),
        sa.Column('done_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'step'),
    )
    op.create_index(op.f('ix_onboarding_steps_id'), 'onboarding_steps', ['id'], unique=False)
    op.create_index(op.f('ix_onboarding_steps_user_id'), 'onboarding_steps', ['user_id'], unique=False)
    op.add_column('users', sa.Column('onboarding_hidden', sa.Boolean(), server_default='false', nullable=False))
    op.execute("UPDATE users SET onboarding_hidden = true")
    op.execute(BACKFILL)


def downgrade() -> None:
    """Remove the Get started steps and the switch."""
    op.drop_column('users', 'onboarding_hidden')
    op.drop_index(op.f('ix_onboarding_steps_user_id'), table_name='onboarding_steps')
    op.drop_index(op.f('ix_onboarding_steps_id'), table_name='onboarding_steps')
    op.drop_table('onboarding_steps')
