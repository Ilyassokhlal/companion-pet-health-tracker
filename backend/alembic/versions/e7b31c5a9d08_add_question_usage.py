"""add question usage

Revision ID: e7b31c5a9d08
Revises: c2f86d1e9a47
Create Date: 2026-10-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e7b31c5a9d08'
down_revision: Union[str, Sequence[str], None] = 'c2f86d1e9a47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the question usage tally behind the trial's daily allowance."""
    op.create_table(
        'question_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_question_usage_id'), 'question_usage', ['id'], unique=False)
    op.create_index(op.f('ix_question_usage_user_id'), 'question_usage', ['user_id'], unique=False)
    op.create_index(op.f('ix_question_usage_created_at'), 'question_usage', ['created_at'], unique=False)


def downgrade() -> None:
    """Remove the question usage tally."""
    op.drop_index(op.f('ix_question_usage_created_at'), table_name='question_usage')
    op.drop_index(op.f('ix_question_usage_user_id'), table_name='question_usage')
    op.drop_index(op.f('ix_question_usage_id'), table_name='question_usage')
    op.drop_table('question_usage')