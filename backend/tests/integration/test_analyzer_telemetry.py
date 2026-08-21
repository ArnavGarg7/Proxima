"""Stage 7E — migrated analyzers produce AIRequest telemetry via the real engine."""
import json
import uuid

import pytest
from sqlalchemy import select, delete, func

from proxima.models.core import User
from proxima.models.ai import AIRequest
from proxima.services import model_registry as mr_mod
from proxima.services.code_suite_service import CodeSuiteService


@pytest.mark.asyncio
async def test_code_analysis_creates_one_airequest(db, monkeypatch):
    user = User(email=f"tel_{uuid.uuid4().hex[:8]}@example.com", name="Tel", role=f"telr_{uuid.uuid4().hex[:6]}")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    async def fake_complete(model, system_prompt, user_message, temperature, max_tokens,
                            response_format="text", structured_output_schema=None):
        # Valid LegacyCodeResult JSON so the real engine validates + audits.
        return json.dumps({
            "operation": "explain", "language_detected": "python",
            "summary": "s", "result_markdown": "# doc",
            "snippet_profile": {"line_count": 2, "function_count": 1, "class_count": 0, "import_count": 0, "comment_lines": 0},
            "review_actions": [], "diagnostics": {},
        })

    # Patch only the provider-invocation boundary; the engine (routing, retry,
    # validation, telemetry) runs for real.
    monkeypatch.setattr(mr_mod.model_registry, "complete", fake_complete)

    async def _count():
        return (await db.execute(
            select(func.count()).select_from(AIRequest).where(AIRequest.user_id == user.user_id)
        )).scalar_one()

    before = await _count()
    result = await CodeSuiteService.analyze(
        db=db, snippet="def f():\n    return 1", operation="explain", language="python", user_id=user.user_id
    )
    assert result["operation"] == "explain"
    after = await _count()
    try:
        assert after - before == 1  # exactly one AIRequest per LLM execution

        row = (await db.execute(
            select(AIRequest).where(AIRequest.user_id == user.user_id)
        )).scalars().first()
        assert row.model_id == "llama-3.3-70b-versatile"   # routed to the registered Groq model
        assert row.task_class == "code_analysis"
        assert row.is_estimated is True
        assert row.tokens_input > 0 and row.tokens_output > 0
    finally:
        await db.execute(delete(AIRequest).where(AIRequest.user_id == user.user_id))
        await db.execute(delete(User).where(User.user_id == user.user_id))
        await db.commit()
