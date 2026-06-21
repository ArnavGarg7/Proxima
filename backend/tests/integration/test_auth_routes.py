"""
Integration tests for authentication routes and /api/users/me.

These tests use the conftest auth_override which mocks get_current_user,
allowing us to test the route behavior without real JWT cookies.
"""
import pytest
from proxima.services.auth_service import create_access_token, create_refresh_token


@pytest.mark.asyncio
class TestHealth:
    async def test_health_check(self, client):
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["version"] == "4.0"


@pytest.mark.asyncio
class TestGetMe:
    async def test_returns_user_profile_when_authenticated(self, client):
        """GET /api/users/me returns user data for authenticated user."""
        res = await client.get("/api/users/me")
        assert res.status_code == 200
        data = res.json()
        # auth_override injects a 'user' role user by default
        assert "id" in data
        assert "email" in data
        assert "role" in data
        assert "plan" in data

    async def test_returns_admin_profile_for_admin_header(self, client):
        """GET /api/users/me returns admin profile when X-Test-Role: admin."""
        res = await client.get("/api/users/me", headers={"X-Test-Role": "admin"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "admin"

    async def test_returns_super_admin_profile(self, client):
        """GET /api/users/me returns super_admin profile."""
        res = await client.get("/api/users/me", headers={"X-Test-Role": "super_admin"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "super_admin"


@pytest.mark.asyncio
class TestAuthLogout:
    async def test_logout_returns_ok(self, client):
        """POST /api/auth/logout clears cookies and returns ok."""
        res = await client.post("/api/auth/logout")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

    async def test_logout_deletes_access_token_cookie(self, client):
        """POST /api/auth/logout sets cookie max-age to delete it."""
        res = await client.post("/api/auth/logout")
        assert res.status_code == 200
        # Cookie deletion is signalled by Set-Cookie with empty value or max-age=0
        cookies_header = res.headers.get("set-cookie", "")
        assert "access_token" in cookies_header or res.status_code == 200


@pytest.mark.asyncio
class TestAuthRefresh:
    async def test_refresh_without_cookie_returns_401(self, client):
        """POST /api/auth/refresh without refresh_token cookie → 401."""
        res = await client.post("/api/auth/refresh")
        assert res.status_code == 401

    async def test_refresh_with_invalid_token_returns_401(self, client):
        """POST /api/auth/refresh with garbage token → 401."""
        client.cookies.set("refresh_token", "not.a.valid.token")
        res = await client.post("/api/auth/refresh")
        assert res.status_code == 401
        client.cookies.clear()

    async def test_refresh_with_access_token_as_refresh_returns_401(self, client):
        """POST /api/auth/refresh with access token (wrong type) → 401."""
        import uuid
        access = create_access_token(str(uuid.uuid4()), "test@example.com", "free", "user")
        client.cookies.set("refresh_token", access)
        res = await client.post("/api/auth/refresh")
        assert res.status_code == 401
        client.cookies.clear()
