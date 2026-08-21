"""Jobs API + durable upload dispatch (Stage 7C)."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from proxima.models.core import User, BackgroundJob


async def _current_user(db) -> User:
    u = (await db.execute(select(User).where(User.role == "user").limit(1))).scalars().first()
    if not u:
        u = User(email="user@example.com", name="Test User", role="user")
        db.add(u)
        await db.commit()
        await db.refresh(u)
    return u


@pytest.mark.asyncio
async def test_upload_returns_job_id(client: AsyncClient):
    content = b"%PDF-1.4\n%Fake PDF content for job dispatch test"
    files = {"file": ("job_doc.pdf", content, "application/pdf")}
    response = await client.post("/api/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert "job_id" in data
    # job_id is a valid UUID (Proxima-owned domain identity)
    uuid.UUID(data["job_id"])


@pytest.mark.asyncio
async def test_list_and_get_own_job(client: AsyncClient, db):
    user = await _current_user(db)
    job = BackgroundJob(
        job_id=uuid.uuid4(), user_id=user.user_id,
        job_type="document_ingestion", status="pending",
    )
    db.add(job)
    await db.commit()

    listing = await client.get("/api/jobs/")
    assert listing.status_code == 200
    ids = [j["job_id"] for j in listing.json()]
    assert str(job.job_id) in ids

    detail = await client.get(f"/api/jobs/{job.job_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["job_id"] == str(job.job_id)
    assert body["status"] == "pending"
    assert body["job_type"] == "document_ingestion"


@pytest.mark.asyncio
async def test_get_other_users_job_is_404(client: AsyncClient, db):
    other = User(email=f"other_{uuid.uuid4()}@example.com", name="Other", role="otheruser")
    db.add(other)
    await db.commit()
    await db.refresh(other)

    job = BackgroundJob(
        job_id=uuid.uuid4(), user_id=other.user_id,
        job_type="document_ingestion", status="pending",
    )
    db.add(job)
    await db.commit()

    # Default request identity is role "user" — must not see another user's job.
    resp = await client.get(f"/api/jobs/{job.job_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_job_invalid_id(client: AsyncClient):
    resp = await client.get("/api/jobs/not-a-uuid")
    assert resp.status_code == 400
