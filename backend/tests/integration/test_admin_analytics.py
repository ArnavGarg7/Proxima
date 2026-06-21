import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_analytics_overview(client: AsyncClient, db):
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
    
    db.add_all([user1, rm1, rm2])
    await db.commit()
    
    # Create AI requests (some legacy, some complete)
    req1 = AIRequest(
        user_id=unique_user,
        model_id=unique_model1,
        task_class="testing",
        tokens_input=100,
        tokens_output=50,
        computed_cost=0.01
    )
    # Legacy record (missing data)
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
    assert data["total_cost"] >= 0.01
    
    # Check top users
    top_users = data["top_users"]
    assert any(u["user_id"] == str(unique_user) for u in top_users)
    
    # Check cost by model
    cost_by_model = data["cost_by_model"]
    assert any(m["model_id"] == unique_model1 for m in cost_by_model)
    assert any(m["model_id"] == unique_model2 for m in cost_by_model)
