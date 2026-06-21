import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_create_prompt_version(client: AsyncClient, db):
    unique_key = f"test_prompt_{uuid.uuid4().hex[:8]}"
    payload = {
        "prompt_key": unique_key,
        "content": "You are a helpful assistant.",
        "is_active": True
    }
    response = await client.post("/api/admin/prompts", json=payload, headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["prompt_key"] == unique_key
    assert data["version"] == 1
    assert data["is_active"] is True
    
    # Create another version
    payload2 = {
        "prompt_key": unique_key,
        "content": "You are an even more helpful assistant.",
        "is_active": True
    }
    response2 = await client.post("/api/admin/prompts", json=payload2, headers={"X-Test-Role": "admin"})
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["version"] == 2
    assert data2["is_active"] is True
    
    # Check that the first version was deactivated
    from proxima.models.ai import PromptVersion
    from sqlalchemy import select
    
    q = select(PromptVersion).where(PromptVersion.version_id == uuid.UUID(data["version_id"]))
    res = await db.execute(q)
    v1 = res.scalar_one()
    assert v1.is_active is False

@pytest.mark.asyncio
async def test_activate_prompt_version(client: AsyncClient, db):
    from proxima.models.ai import PromptVersion
    
    unique_key = f"activation_test_{uuid.uuid4().hex[:8]}"
    p1 = PromptVersion(prompt_key=unique_key, content="V1", version=1, is_active=True)
    p2 = PromptVersion(prompt_key=unique_key, content="V2", version=2, is_active=False)
    db.add_all([p1, p2])
    await db.commit()
    await db.refresh(p1)
    await db.refresh(p2)
    
    response = await client.patch(f"/api/admin/prompts/{str(p2.version_id)}/activate", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    
    await db.refresh(p1)
    await db.refresh(p2)
    
    assert p1.is_active is False
    assert p2.is_active is True

@pytest.mark.asyncio
async def test_list_prompts(client: AsyncClient, db):
    from proxima.models.ai import PromptVersion
    unique_key = f"list_test_{uuid.uuid4().hex[:8]}"
    p1 = PromptVersion(prompt_key=unique_key, content="V1", version=1, is_active=True)
    p2 = PromptVersion(prompt_key=unique_key, content="V2", version=2, is_active=False)
    db.add_all([p1, p2])
    await db.commit()
    
    response = await client.get(f"/api/admin/prompts?prompt_key={unique_key}", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
