"""Stage 7B Retrieval Indexes

Revision ID: 2026_08_14_7b_indexes
Revises: 2026_08_11_1030_add_is_estimated
Create Date: 2026-08-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_14_7b_indexes'
down_revision: Union[str, None] = '2026_08_11_1030_add_is_estimated'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Seed text-embedding-004
    op.execute("""
    INSERT INTO registered_models (
        model_id, provider, model_type, context_window, 
        embedding_dimensions, embedding_version, cost_per_1m_input, 
        cost_per_1m_output, supports_streaming, is_active, 
        is_default_generation, is_default_embedding
    )
    VALUES (
        'text-embedding-004', 'google', 'embedding', 2048, 
        768, 'v1', 0.025, 0.0, false, true, false, true
    )
    ON CONFLICT (model_id) DO NOTHING;
    """)

    # 2. Create indices
    op.execute("CREATE INDEX IF NOT EXISTS idx_chunks_content_fts ON document_chunks USING gin (to_tsvector('english', content));")
    op.execute("CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_chunks_content_fts;")
    op.execute("DELETE FROM registered_models WHERE model_id = 'text-embedding-004';")
