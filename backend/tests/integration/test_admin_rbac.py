import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_standard_user_access_denied(client: AsyncClient):
    # Standard user trying to hit admin routes
    response = await client.patch(
        "/api/admin/users/123/deactivate",
        json={"is_active": False},
        headers={"X-Test-Role": "user"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"

@pytest.mark.asyncio
async def test_admin_cannot_change_roles(client: AsyncClient):
    # 'admin' role trying to change another user's role (requires super_admin)
    response = await client.patch(
        "/api/admin/users/123/role",
        json={"role": "admin"},
        headers={"X-Test-Role": "admin"}
    )
    assert response.status_code == 403
    assert "Super admin access required" in response.json()["detail"]

@pytest.mark.asyncio
async def test_admin_cannot_deactivate_other_admins(client: AsyncClient, db):
    # 'admin' role trying to deactivate another 'admin'
    from proxima.models.core import User
    import uuid
    
    target_id = uuid.uuid4()
    target = User(user_id=target_id, email=f"other_admin_{target_id}@example.com", name="Other", role="admin")
    db.add(target)
    await db.commit()
    
    response = await client.patch(
        f"/api/admin/users/{str(target_id)}/deactivate",
        json={"is_active": False},
        headers={"X-Test-Role": "admin"}
    )
    assert response.status_code == 403
    assert "Standard admin cannot deactivate other admins" in response.json()["detail"]

@pytest.mark.asyncio
async def test_admin_can_deactivate_standard_users(client: AsyncClient, db):
    from proxima.models.core import User
    import uuid
    
    target_id = uuid.uuid4()
    target = User(user_id=target_id, email=f"std_{target_id}@example.com", name="Std", role="user")
    db.add(target)
    await db.commit()
    
    response = await client.patch(
        f"/api/admin/users/{str(target_id)}/deactivate",
        json={"is_active": False},
        headers={"X-Test-Role": "admin"}
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False

@pytest.mark.asyncio
async def test_self_escalation_prevention(client: AsyncClient, db):
    from proxima.models.core import User
    from sqlalchemy import select
    import uuid
    
    dummy_id = str(uuid.uuid4())
    response_auth = await client.patch(
        f"/api/admin/users/{dummy_id}/role",
        json={"role": "user"},
        headers={"X-Test-Role": "super_admin"}
    )
    
    result = await db.execute(select(User).where(User.role == "super_admin").limit(1))
    super_admin = result.scalars().first()
    
    response = await client.patch(
        f"/api/admin/users/{str(super_admin.user_id)}/role",
        json={"role": "user"},
        headers={"X-Test-Role": "super_admin"}
    )
    
    assert response.status_code == 400
    assert "Cannot modify own privileges" in response.json()["detail"]

@pytest.mark.asyncio
async def test_self_deactivation_prevention(client: AsyncClient, db):
    from proxima.models.core import User
    from sqlalchemy import select
    import uuid
    
    dummy_id = str(uuid.uuid4())
    await client.patch(f"/api/admin/users/{dummy_id}/deactivate", json={"is_active": False}, headers={"X-Test-Role": "admin"})
    
    result = await db.execute(select(User).where(User.role == "admin").limit(1))
    admin = result.scalars().first()
    
    response = await client.patch(
        f"/api/admin/users/{str(admin.user_id)}/deactivate",
        json={"is_active": False},
        headers={"X-Test-Role": "admin"}
    )
    
    assert response.status_code == 400
    assert "Cannot deactivate own account" in response.json()["detail"]

@pytest.mark.asyncio
async def test_super_admin_can_change_roles(client: AsyncClient, db):
    from proxima.models.core import User
    import uuid
    
    target_id = uuid.uuid4()
    target = User(user_id=target_id, email=f"promoted_{target_id}@example.com", name="Promo", role="user")
    db.add(target)
    await db.commit()
    
    response = await client.patch(
        f"/api/admin/users/{str(target_id)}/role",
        json={"role": "admin"},
        headers={"X-Test-Role": "super_admin"}
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
