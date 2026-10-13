"""add ai reports

Revision ID: f6c3a8d2b417
Revises: a9d4f2c6b813
Create Date: 2026-10-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f6c3a8d2b417'
down_revision: Union[str, Sequence[str], None] = 'a9d4f2c6b813'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The one place the dashboard reads chat text: the owner chose to see reported answers in full (2026-10-13)
VIEW = """
CREATE VIEW stats.ai_reports AS
SELECT id, created_at, user_id, reason, note, question, answer FROM public.ai_reports
"""


def upgrade() -> None:
    """Add the reports users make on AI answers, and their stats view."""
    op.create_table(
        'ai_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('message_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(length=20), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('question', sa.Text(), nullable=True),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['chat_messages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id'),
    )
    op.create_index(op.f('ix_ai_reports_created_at'), 'ai_reports', ['created_at'], unique=False)
    op.create_index(op.f('ix_ai_reports_id'), 'ai_reports', ['id'], unique=False)
    op.create_index(op.f('ix_ai_reports_user_id'), 'ai_reports', ['user_id'], unique=False)
    op.execute(VIEW)


def downgrade() -> None:
    """Remove the reports and their view."""
    op.execute("DROP VIEW stats.ai_reports")
    op.drop_index(op.f('ix_ai_reports_user_id'), table_name='ai_reports')
    op.drop_index(op.f('ix_ai_reports_id'), table_name='ai_reports')
    op.drop_index(op.f('ix_ai_reports_created_at'), table_name='ai_reports')
    op.drop_table('ai_reports')
