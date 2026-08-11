"""Add is_estimated to ai_requests

Revision ID: 2026_08_11_1030_add_is_estimated
Revises: 0658d77a9003
Create Date: 2026-08-11 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_11_1030_add_is_estimated'
down_revision: Union[str, None] = '0658d77a9003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('ai_requests', sa.Column('is_estimated', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('ai_requests', 'is_estimated')
