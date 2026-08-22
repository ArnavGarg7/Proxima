"""Stage 8: /api/health readiness behaviour (database + Redis connectivity)."""
import pytest
from httpx import AsyncClient

import proxima.main as main


async def _ok():
    return None


def _boom(component):
    async def _f():
        raise RuntimeError(f"{component} down")
    return _f


@pytest.mark.asyncio
async def test_health_ok_when_dependencies_reachable(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(main, "_check_database", _ok)
    monkeypatch.setattr(main, "_check_redis", _ok)
    r = await client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["checks"] == {"database": "ok", "redis": "ok"}


@pytest.mark.asyncio
async def test_health_unhealthy_when_database_down(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(main, "_check_database", _boom("database"))
    monkeypatch.setattr(main, "_check_redis", _ok)
    r = await client.get("/api/health")
    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "unavailable"
    assert body["checks"]["database"] == "unavailable"
    assert body["checks"]["redis"] == "ok"


@pytest.mark.asyncio
async def test_health_unhealthy_when_redis_down(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(main, "_check_database", _ok)
    monkeypatch.setattr(main, "_check_redis", _boom("redis"))
    r = await client.get("/api/health")
    assert r.status_code == 503
    assert r.json()["checks"]["redis"] == "unavailable"


@pytest.mark.asyncio
async def test_health_never_leaks_connection_details(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(main, "_check_database", _boom("database"))
    monkeypatch.setattr(main, "_check_redis", _ok)
    r = await client.get("/api/health")
    text = r.text
    assert "postgresql" not in text and "redis://" not in text and "password" not in text.lower()


@pytest.mark.asyncio
async def test_liveness_is_static(client: AsyncClient):
    r = await client.get("/api/health/live")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
