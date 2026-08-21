"""Fix default embedding model — text-embedding-004 -> gemini-embedding-001

The registered default embedding (`text-embedding-004`) is no longer served by
the Gemini API (`404 ... not found for API version v1beta`), so every embedding
generation failed and no chunk was ever vectorized (retrieval silently ran
FTS-only). Register `gemini-embedding-001` (served, 768-dim via
output_dimensionality) as the active default and retire the dead model. Data
only; the pgvector column stays vector(768).

Revision ID: 2026_08_24_embedfix
Revises: 2026_08_23_7f_p0
Create Date: 2026-08-24 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = '2026_08_24_embedfix'
down_revision: Union[str, None] = '2026_08_23_7f_p0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Register the served embedding model (idempotent). 768-dim keeps the
    # existing vector(768) column and chunk contract intact.
    op.execute(
        "INSERT INTO registered_models "
        "(model_id, provider, model_type, context_window, embedding_dimensions, "
        " embedding_version, cost_per_1m_input, cost_per_1m_output, "
        " supports_streaming, is_active, is_default_generation, is_default_embedding, created_at) "
        "VALUES ('gemini-embedding-001', 'google', 'embedding', 2048, 768, 'gemini-embedding-001', "
        "        0.0, 0.0, false, true, false, true, now()) "
        "ON CONFLICT (model_id) DO UPDATE SET "
        "  model_type = EXCLUDED.model_type, "
        "  embedding_dimensions = EXCLUDED.embedding_dimensions, "
        "  embedding_version = EXCLUDED.embedding_version, "
        "  is_active = true, "
        "  is_default_embedding = true;"
    )

    # Retire the dead default so exactly one active default embedding remains.
    op.execute(
        "UPDATE registered_models "
        "SET is_default_embedding = false, is_active = false "
        "WHERE model_id = 'text-embedding-004';"
    )


def downgrade() -> None:
    # Restore text-embedding-004 as the (previous) default and deactivate the new one.
    op.execute(
        "UPDATE registered_models "
        "SET is_default_embedding = true, is_active = true "
        "WHERE model_id = 'text-embedding-004';"
    )
    op.execute(
        "UPDATE registered_models "
        "SET is_default_embedding = false, is_active = false "
        "WHERE model_id = 'gemini-embedding-001';"
    )
