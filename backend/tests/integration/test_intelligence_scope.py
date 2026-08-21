"""WS-1 endpoint scope + WS-3 streaming telemetry/grounding (Stage 7D)."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, delete, func

from proxima.models.core import User, Document, DocumentChunk
from proxima.models.ai import AIRequest, ResponseGrounding, RegisteredModel
from proxima.services.execution.engine import ProximaAIEngine


class _FakeStream:
    def __init__(self, model_id, tokens):
        self.provider = "google"
        self.model_id = model_id
        self._tokens = tokens

    @property
    def content_stream(self):
        async def gen():
            for t in self._tokens:
                yield t
        return gen()


async def _ensure_gen_model(db):
    m = (await db.execute(select(RegisteredModel).where(RegisteredModel.model_type == "generation").limit(1))).scalars().first()
    if m:
        return m.model_id, False
    m = RegisteredModel(model_id=f"test-gen-{uuid.uuid4().hex[:6]}", provider="google",
                        model_type="generation", cost_per_1m_input=1.0, cost_per_1m_output=1.0, is_active=True)
    db.add(m)
    await db.commit()
    return m.model_id, True


async def _mk_user(db, role):
    u = User(email=f"{role}_{uuid.uuid4().hex[:6]}@example.com", name="Scoped", role=role)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def _mk_doc(db, user, content, status="processed"):
    d = Document(user_id=user.user_id, title="d.txt", status=status)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    db.add(DocumentChunk(document_id=d.document_id, chunk_index=0, content=content,
                         chunk_type="text", metadata_fields={"page_number": 1}))
    await db.commit()
    return d


async def _cleanup(db, users, docs, created_model_id=None):
    for u in users:
        await db.execute(delete(ResponseGrounding).where(ResponseGrounding.user_id == u.user_id))
        await db.execute(delete(AIRequest).where(AIRequest.user_id == u.user_id))
    for d in docs:
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == d.document_id))
        await db.execute(delete(Document).where(Document.document_id == d.document_id))
    if created_model_id:
        await db.execute(delete(RegisteredModel).where(RegisteredModel.model_id == created_model_id))
    for u in users:
        await db.execute(delete(User).where(User.user_id == u.user_id))
    await db.commit()


async def _count(db, model, user_id):
    return (await db.execute(select(func.count()).select_from(model).where(model.user_id == user_id))).scalar_one()


@pytest.mark.asyncio
async def test_single_document_streams_and_audits_once(client: AsyncClient, db, monkeypatch):
    role = f"scope1_{uuid.uuid4().hex[:6]}"
    user = await _mk_user(db, role)
    model_id, created = await _ensure_gen_model(db)
    doc = await _mk_doc(db, user, "This contract discusses liability and indemnification clauses.")
    try:
        async def fake_execute(db_, request, stream=True):
            return _FakeStream(model_id, ["The answer is ", "[Ref 1]", " per the contract."])
        monkeypatch.setattr(ProximaAIEngine, "execute", fake_execute)

        resp = await client.post("/api/intelligence/complete",
                                 headers={"X-Test-Role": role},
                                 json={"document_id": str(doc.document_id), "user_task": "contract liability"})
        assert resp.status_code == 200
        body = resp.text
        assert '"type": "chunk"' in body
        assert '"type": "grounding"' in body

        # WS-3: exactly one AIRequest + one ResponseGrounding.
        assert await _count(db, AIRequest, user.user_id) == 1
        assert await _count(db, ResponseGrounding, user.user_id) == 1

        rg = (await db.execute(select(ResponseGrounding).where(ResponseGrounding.user_id == user.user_id))).scalars().first()
        assert rg.success is True
        assert rg.citation_count == 1
        assert rg.model_id == model_id
        # Provenance only — no snippet / content persisted.
        for c in rg.citations:
            assert set(c.keys()) <= {"ref_key", "chunk_id", "document_id", "document_title", "page_number"}
            assert "snippet" not in c
            assert c["document_id"] == str(doc.document_id)
    finally:
        await _cleanup(db, [user], [doc], model_id if created else None)


@pytest.mark.asyncio
async def test_multi_document_scope_excludes_foreign(client: AsyncClient, db, monkeypatch):
    role = f"scope2_{uuid.uuid4().hex[:6]}"
    owner = await _mk_user(db, role)
    other = await _mk_user(db, f"foreign_{uuid.uuid4().hex[:6]}")
    model_id, created = await _ensure_gen_model(db)
    own_doc = await _mk_doc(db, owner, "The contract alpha covers payment obligations.")
    foreign_doc = await _mk_doc(db, other, "The contract secretforeign covers hidden terms.")
    try:
        async def fake_execute(db_, request, stream=True):
            return _FakeStream(model_id, ["Based on ", "[Ref 1]", " the answer."])
        monkeypatch.setattr(ProximaAIEngine, "execute", fake_execute)

        # Owner supplies BOTH ids; the foreign one must be silently excluded.
        resp = await client.post("/api/intelligence/complete",
                                 headers={"X-Test-Role": role},
                                 json={"document_ids": [str(own_doc.document_id), str(foreign_doc.document_id)],
                                       "user_task": "contract"})
        assert resp.status_code == 200
        rg = (await db.execute(select(ResponseGrounding).where(ResponseGrounding.user_id == owner.user_id))).scalars().first()
        assert rg is not None
        # Any resolved citation must belong to the owner's document only.
        for c in (rg.citations or []):
            assert c["document_id"] == str(own_doc.document_id)
    finally:
        await _cleanup(db, [owner, other], [own_doc, foreign_doc], model_id if created else None)


@pytest.mark.asyncio
async def test_foreign_single_document_forbidden(client: AsyncClient, db):
    role = f"scope3_{uuid.uuid4().hex[:6]}"
    owner = await _mk_user(db, role)
    other = await _mk_user(db, f"foreign_{uuid.uuid4().hex[:6]}")
    foreign_doc = await _mk_doc(db, other, "secret content")
    try:
        resp = await client.post("/api/intelligence/complete",
                                 headers={"X-Test-Role": role},
                                 json={"document_id": str(foreign_doc.document_id), "user_task": "hi"})
        assert resp.status_code == 403
    finally:
        await _cleanup(db, [owner, other], [foreign_doc])


@pytest.mark.asyncio
async def test_stream_failure_records_telemetry(client: AsyncClient, db, monkeypatch):
    role = f"scope4_{uuid.uuid4().hex[:6]}"
    user = await _mk_user(db, role)
    model_id, created = await _ensure_gen_model(db)
    doc = await _mk_doc(db, user, "The contract beta discusses termination.")
    try:
        async def boom(db_, request, stream=True):
            raise RuntimeError("provider exploded")
        monkeypatch.setattr(ProximaAIEngine, "execute", boom)

        resp = await client.post("/api/intelligence/complete",
                                 headers={"X-Test-Role": role},
                                 json={"document_id": str(doc.document_id), "user_task": "contract"})
        assert resp.status_code == 200  # SSE transport; error delivered in-band
        assert '"type": "error"' in resp.text
        # Failure telemetry persisted (success False). No model was selected → no AIRequest.
        rg = (await db.execute(select(ResponseGrounding).where(ResponseGrounding.user_id == user.user_id))).scalars().first()
        assert rg is not None
        assert rg.success is False
    finally:
        await _cleanup(db, [user], [doc], model_id if created else None)
