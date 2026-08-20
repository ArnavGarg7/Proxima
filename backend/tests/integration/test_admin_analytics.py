import pytest
from httpx import AsyncClient
import uuid


@pytest.mark.asyncio
async def test_analytics_overview(client: AsyncClient, db):
    from sqlalchemy import delete
    from proxima.models.core import User
    from proxima.models.ai import AIRequest, RegisteredModel

    unique_user = uuid.uuid4()
    user1 = User(
        user_id=unique_user,
        email=f"analytics_{unique_user.hex[:8]}@example.com",
        name="Analytics User",
        role="user",
        is_active=True
    )

    unique_model1 = f"model-pro-{uuid.uuid4().hex[:4]}"
    unique_model2 = f"model-flash-{uuid.uuid4().hex[:4]}"

    rm1 = RegisteredModel(
        model_id=unique_model1, provider="google", model_type="generation",
        is_active=True, cost_per_1m_input=0.0, cost_per_1m_output=0.0
    )
    rm2 = RegisteredModel(
        model_id=unique_model2, provider="google", model_type="generation",
        is_active=True, cost_per_1m_input=0.0, cost_per_1m_output=0.0
    )

    # The "top users by cost" query is ORDER BY total_cost DESC LIMIT 10. Give
    # this user a distinctive, dominant cost so it deterministically ranks in the
    # top-10 regardless of how many other users exist in the (shared) database —
    # otherwise ties at a small cost make top-10 membership nondeterministic.
    DOMINANT_COST = 100.0

    try:
        db.add_all([user1, rm1, rm2])
        await db.commit()

        # Create AI requests (one complete, one legacy with missing data).
        req1 = AIRequest(
            user_id=unique_user,
            model_id=unique_model1,
            task_class="testing",
            tokens_input=100,
            tokens_output=50,
            computed_cost=DOMINANT_COST
        )
        # Legacy record (missing data) — exercises the COALESCE paths.
        req2 = AIRequest(
            user_id=unique_user,
            model_id=unique_model2,
            task_class="testing",
            tokens_input=None,
            tokens_output=None,
            computed_cost=None
        )
        db.add_all([req1, req2])
        await db.commit()

        response = await client.get("/api/admin/analytics/overview", headers={"X-Test-Role": "admin"})
        assert response.status_code == 200
        data = response.json()["data"]

        assert "total_users" in data
        assert "active_users" in data
        assert data["total_requests"] >= 2
        assert data["total_tokens"] >= 150
        assert data["total_cost"] >= DOMINANT_COST

        # Check top users — the dominant cost guarantees deterministic inclusion.
        top_users = data["top_users"]
        assert any(u["user_id"] == str(unique_user) for u in top_users)

        # Check cost by model (unbounded list — both models always present).
        cost_by_model = data["cost_by_model"]
        assert any(m["model_id"] == unique_model1 for m in cost_by_model)
        assert any(m["model_id"] == unique_model2 for m in cost_by_model)
    finally:
        # Proper isolation: remove everything this test created so it never
        # pollutes the shared database (AIRequests first — model FK is RESTRICT).
        await db.execute(delete(AIRequest).where(AIRequest.user_id == unique_user))
        await db.execute(delete(RegisteredModel).where(RegisteredModel.model_id.in_([unique_model1, unique_model2])))
        await db.execute(delete(User).where(User.user_id == unique_user))
        await db.commit()
