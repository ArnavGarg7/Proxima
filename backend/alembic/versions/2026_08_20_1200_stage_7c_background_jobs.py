"""Stage 7C background jobs — started_at + listing index

Revision ID: 2026_08_20_7c_jobs
Revises: 2026_08_14_7b_indexes
Create Date: 2026-08-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_20_7c_jobs'
down_revision: Union[str, None] = '2026_08_14_7b_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # started_at — job lifecycle timestamp (set when a worker begins processing).
    op.add_column(
        'background_jobs',
        sa.Column('started_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    # Listing index — jobs are queried per-user, newest first.
    op.create_index(
        'idx_jobs_user_created',
        'background_jobs',
        ['user_id', 'created_at'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('idx_jobs_user_created', table_name='background_jobs')
    op.drop_column('background_jobs', 'started_at')
