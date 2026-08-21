"""Stage 7E — model registry routing + provider-bypass guards."""
import pytest
from sqlalchemy import select

from proxima.models.ai import RegisteredModel
from proxima.services.model_registry import model_registry


@pytest.mark.asyncio
@pytest.mark.parametrize("task_class,domain", [
    ("legal_analysis", "legal"),
    ("clinical_analysis", "clinical"),
    ("compare_analysis", None),
    ("code_analysis", None),
])
async def test_task_routing_llama_then_gemini(db, task_class, domain):
    candidates = await model_registry.get_routing_candidates_for_task(task_class, domain, db)
    ids = [c.model_id for c in candidates]
    assert ids[0] == "llama-3.3-70b-versatile"          # Groq primary
    assert "gemini-2.5-flash" in ids                      # Gemini fallback present
    # never route to a deactivated / stub-provider model
    assert not ({"o1", "o3-mini", "claude-3.5-sonnet"} & set(ids))


@pytest.mark.asyncio
async def test_working_model_registered_and_stubs_disabled(db):
    rows = (await db.execute(
        select(RegisteredModel).where(
            RegisteredModel.model_id.in_(
                ["llama-3.3-70b-versatile", "o1", "o3-mini", "claude-3.5-sonnet", "gemini-2.5-flash"]
            )
        )
    )).scalars().all()
    state = {r.model_id: r.is_active for r in rows}
    assert state.get("llama-3.3-70b-versatile") is True
    assert state.get("gemini-2.5-flash") is True
    assert state.get("o1") is False
    assert state.get("o3-mini") is False
    assert state.get("claude-3.5-sonnet") is False


def test_no_direct_provider_bypass_in_migrated_analyzers():
    import proxima.services.contract_analyzer as c
    import proxima.services.clinical_analyzer as cl
    import proxima.services.compare_analyzer as cm
    import proxima.services.code_suite_service as cs
    import proxima.services.code_analysis.analyzer as ca
    import proxima.services.code_analysis.synthesizer as sy

    forbidden = ["AsyncOpenAI", "AsyncGroq", "google.generativeai",
                 "GROQ_API_KEY", "llama-3.3-70b", "gemini-2.5-flash", "groq.com"]
    for mod in (c, cl, cm, cs, ca, sy):
        src = open(mod.__file__, encoding="utf-8").read()
        for token in forbidden:
            assert token not in src, f"{mod.__name__} still references {token}"
