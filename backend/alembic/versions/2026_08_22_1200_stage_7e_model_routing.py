"""Stage 7E — model registry reality + analyzer task routing

Registers the working Groq model, deactivates unroutable/stub-provider models,
and adds deliberate task-class routing (Groq primary, Gemini fallback) for the
analyzers being migrated onto ProximaAIEngine. Data-only; no schema changes.

Revision ID: 2026_08_22_7e_routing
Revises: 2026_08_21_7d_grounding
Create Date: 2026-08-22 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = '2026_08_22_7e_routing'
down_revision: Union[str, None] = '2026_08_21_7d_grounding'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TASK_CLASSES = ('legal_analysis', 'clinical_analysis', 'compare_analysis', 'code_analysis')


def upgrade() -> None:
    # 1. Register the model actually used in production (Groq via the OpenAI-compatible adapter).
    op.execute("""
        INSERT INTO registered_models (
            model_id, provider, model_type, context_window,
            cost_per_1m_input, cost_per_1m_output, supports_streaming,
            is_active, is_default_generation, is_default_embedding
        )
        VALUES (
            'llama-3.3-70b-versatile', 'openai', 'generation', 128000,
            0.59, 0.79, true, true, false, false
        )
        ON CONFLICT (model_id) DO NOTHING;
    """)

    # 2. Deactivate models that cannot actually be invoked by their configured provider:
    #    - o1 / o3-mini are registered under provider 'openai' but that adapter targets Groq.
    #    - claude-3.5-sonnet maps to a stub AnthropicProvider.
    op.execute("""
        UPDATE registered_models SET is_active = false
        WHERE model_id IN ('o1', 'o3-mini', 'claude-3.5-sonnet');
    """)

    # 3. Deliberate task routing via the existing ModelRoutingRule mechanism:
    #    Groq llama primary → Gemini fallback. (Idempotent: clear then insert.)
    op.execute(
        "DELETE FROM model_routing_rules WHERE task_class IN "
        "('legal_analysis','clinical_analysis','compare_analysis','code_analysis');"
    )
    values = []
    for tc in _TASK_CLASSES:
        values.append(f"(gen_random_uuid(), '{tc}', NULL, 'llama-3.3-70b-versatile', 0, true)")
        values.append(f"(gen_random_uuid(), '{tc}', NULL, 'gemini-2.5-flash', 1, true)")
    op.execute(
        "INSERT INTO model_routing_rules (rule_id, task_class, domain, model_id, priority, is_active) VALUES "
        + ", ".join(values) + ";"
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM model_routing_rules WHERE task_class IN "
        "('legal_analysis','clinical_analysis','compare_analysis','code_analysis');"
    )
    op.execute("""
        UPDATE registered_models SET is_active = true
        WHERE model_id IN ('o1', 'o3-mini', 'claude-3.5-sonnet');
    """)
    op.execute("DELETE FROM registered_models WHERE model_id = 'llama-3.3-70b-versatile';")
