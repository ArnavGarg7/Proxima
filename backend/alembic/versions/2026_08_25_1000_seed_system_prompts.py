"""Seed required system prompts so a fresh database is fully usable

The model registry and routing rules are already migration-seeded, but the
`prompt_versions` table was not — on a fresh database `assemble_prompt` fell
back to a generic "You are a helpful AI assistant." prompt, silently degrading
every analyzer. This seeds the four required system prompts (version 1, active)
that the prompt assembler looks up by key.

Content is the existing production prompt text; nothing here is newly invented.
Idempotent: each row is inserted only when its key is absent, so this is safe on
databases where the prompts were already created manually (e.g. via the admin
API). Domain knowledge chunks and templates are intentionally NOT seeded here —
no authoritative repository seed exists for them.

Revision ID: 2026_08_25_prompts
Revises: 2026_08_24_embedfix
Create Date: 2026-08-25 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2026_08_25_prompts'
down_revision: Union[str, None] = '2026_08_24_embedfix'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# prompt_key -> content (existing production prompts; not invented here).
_PROMPTS = {
    "system_default": "You are Proxima, a highly intelligent AI assistant. Use the provided context to answer accurately.",
    "system_legal": "You are an expert legal AI assistant. Review the provided context focusing on liabilities and contractual obligations.",
    "system_medical": "You are an expert medical AI assistant. Extract clinical facts, diagnoses, and treatments accurately without prescribing.",
    "system_code": "You are a senior software engineer. Analyze the code context, identify bugs, and suggest optimizations.",
}


def upgrade() -> None:
    # Explicit casts: asyncpg cannot infer a single type for :key used in both
    # the INSERT (varchar) and the WHERE comparison, so cast both parameters.
    stmt = sa.text(
        "INSERT INTO prompt_versions (prompt_key, content, version, is_active) "
        "SELECT CAST(:key AS VARCHAR), CAST(:content AS TEXT), 1, true "
        "WHERE NOT EXISTS (SELECT 1 FROM prompt_versions WHERE prompt_key = CAST(:key AS VARCHAR))"
    )
    conn = op.get_bind()
    for key, content in _PROMPTS.items():
        conn.execute(stmt, {"key": key, "content": content})


def downgrade() -> None:
    # Only remove the exact rows this migration seeds (version 1 with the seeded
    # content), leaving any manually-created versions untouched.
    stmt = sa.text(
        "DELETE FROM prompt_versions "
        "WHERE prompt_key = CAST(:key AS VARCHAR) AND version = 1 AND content = CAST(:content AS TEXT)"
    )
    conn = op.get_bind()
    for key, content in _PROMPTS.items():
        conn.execute(stmt, {"key": key, "content": content})
