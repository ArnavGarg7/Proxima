"""Stage 7F P0 — documents indexes + domain_analysis routing

Adds the missing user-scoping indexes on documents and deliberate task routing
for domain_radar (now migrated onto ProximaAIEngine): Groq llama primary ->
Gemini fallback, consistent with the 7E analyzer routing. Data/DDL only.

Revision ID: 2026_08_23_7f_p0
Revises: 2026_08_22_7e_routing
Create Date: 2026-08-23 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = '2026_08_23_7f_p0'
down_revision: Union[str, None] = '2026_08_22_7e_routing'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Every user-scoped document query filters by user_id (and project scope by
    # project_id); these were unindexed.
    op.execute("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents (project_id);")

    # domain_radar routing: Groq llama primary -> Gemini fallback.
    op.execute("DELETE FROM model_routing_rules WHERE task_class = 'domain_analysis';")
    op.execute(
        "INSERT INTO model_routing_rules (rule_id, task_class, domain, model_id, priority, is_active) VALUES "
        "(gen_random_uuid(), 'domain_analysis', NULL, 'llama-3.3-70b-versatile', 0, true), "
        "(gen_random_uuid(), 'domain_analysis', NULL, 'gemini-2.5-flash', 1, true);"
    )


def downgrade() -> None:
    op.execute("DELETE FROM model_routing_rules WHERE task_class = 'domain_analysis';")
    op.execute("DROP INDEX IF EXISTS idx_documents_project_id;")
    op.execute("DROP INDEX IF EXISTS idx_documents_user_id;")
