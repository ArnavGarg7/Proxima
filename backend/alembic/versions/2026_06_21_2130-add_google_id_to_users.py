"""add google_id and last_login_at to users

Revision ID: 2026_06_21_2130_add_google_id
Revises: 0960d4911543
Create Date: 2026-06-21 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_06_21_2130_add_google_id'
down_revision = '0960d4911543'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_login_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.create_index('idx_users_google_id', 'users', ['google_id'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_users_google_id', table_name='users')
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'google_id')
