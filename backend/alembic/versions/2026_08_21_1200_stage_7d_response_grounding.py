"""Stage 7D — durable response grounding telemetry

Revision ID: 2026_08_21_7d_grounding
Revises: 2026_08_20_7c_jobs
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2026_08_21_7d_grounding'
down_revision: Union[str, None] = '2026_08_20_7c_jobs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'response_grounding',
        sa.Column('grounding_id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ai_request_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('model_id', sa.String(length=100), nullable=True),
        sa.Column('task_class', sa.String(length=100), nullable=False),
        sa.Column('grounding_status', sa.String(length=50), nullable=False),
        sa.Column('grounding_score', sa.Float(), server_default=sa.text('0'), nullable=False),
        sa.Column('citation_validity', sa.Float(), server_default=sa.text('0'), nullable=False),
        sa.Column('evidence_coverage', sa.Float(), server_default=sa.text('0'), nullable=False),
        sa.Column('citation_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('invalid_reference_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('latency_ms', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('success', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('citations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ai_request_id'], ['ai_requests.request_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.document_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('grounding_id'),
    )
    op.create_index('idx_response_grounding_user_created', 'response_grounding', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_response_grounding_user_created', table_name='response_grounding')
    op.drop_table('response_grounding')
