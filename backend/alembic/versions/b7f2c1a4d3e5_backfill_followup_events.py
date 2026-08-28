"""backfill followup events from existing next_due_date

Revision ID: b7f2c1a4d3e5
Revises: e55d02345dcb
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7f2c1a4d3e5'
down_revision: Union[str, Sequence[str], None] = 'e55d02345dcb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Give every pre-existing record with a next_due_date the follow-up event it should have.

    This ensures that all existing health records with a next_due_date have a corresponding follow-up event.
    """
    op.execute(
        """
        INSERT INTO scheduled_events (pet_id, title, kind, due_date, source_record_id, created_at)
        SELECT r.pet_id, r.title, 'RECORD_FOLLOWUP'::eventkind, r.next_due_date, r.id, LOCALTIMESTAMP
        FROM health_records r
        WHERE r.next_due_date IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM scheduled_events e
              WHERE e.source_record_id = r.id
                AND e.completed_at IS NULL
          )
        """
    )


def downgrade() -> None:
    """Not reversible: these rows are indistinguishable from events created normally afterwards."""
    raise NotImplementedError("Backfilled events cannot be told apart from real ones.")