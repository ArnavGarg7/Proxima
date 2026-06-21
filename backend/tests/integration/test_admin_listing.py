import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, db):
    from proxima.models.core import User
    
    # Create some mock users
    users = [
        User(user_id=uuid.uuid4(), email=f"user_{i}@example.com", name=f"Name {i}", role="user" if i % 2 == 0 else "admin", is_active=True)
        for i in range(5)
    ]
    db.add_all(users)
    await db.commit()
    
    response = await client.get("/api/admin/users?limit=2&skip=0", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert len(data["items"]) == 2
    
@pytest.mark.asyncio
async def test_list_users_filtering(client: AsyncClient, db):
    from proxima.models.core import User
    
    # Create specific user for search
    unique_id = uuid.uuid4()
    target = User(user_id=unique_id, email=f"unique_{unique_id}@example.com", name="UniqueSearchName", role="user")
    db.add(target)
    await db.commit()
    
    response = await client.get("/api/admin/users?search=UniqueSearchName", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "UniqueSearchName"
    
@pytest.mark.asyncio
async def test_list_logs(client: AsyncClient, db):
    from proxima.models.admin import AdminAuditLog
    from proxima.models.core import User
    from sqlalchemy import select
    
    response_auth = await client.patch(
        f"/api/admin/users/dummy/role",
        json={"role": "user"},
        headers={"X-Test-Role": "admin"}
    )
    
    result = await db.execute(select(User).where(User.role == "admin").limit(1))
    admin_user = result.scalars().first()
    
    logs = [
        AdminAuditLog(
            admin_user_id=admin_user.user_id,
            action=f"action_{i}",
            target_resource="user:dummy",
            details={},
            ip_address="127.0.0.1"
        )
        for i in range(3)
    ]
    db.add_all(logs)
    await db.commit()
    
    response = await client.get("/api/admin/logs?limit=2", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2

@pytest.mark.asyncio
async def test_list_logs_filtering(client: AsyncClient, db):
    response = await client.get("/api/admin/logs?action=action_1", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    # It might find the one inserted above
    if data["total"] > 0:
        assert all(item["action"] == "action_1" for item in data["items"])
