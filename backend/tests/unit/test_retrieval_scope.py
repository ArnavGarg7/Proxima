"""WS-1: library-scoped cross-document hybrid retrieval (Stage 7D)."""
import uuid

import pytest
from sqlalchemy import delete

from proxima.models.core import User, Document, DocumentChunk
from proxima.services.retrieval_hybrid import HybridRetrievalService


async def _mk_user(db, role="user"):
    u = User(email=f"scope_{uuid.uuid4().hex[:8]}@example.com", name="Scope", role=role)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def _mk_doc(db, user, project_id=None, status="processed"):
    d = Document(user_id=user.user_id, title="doc.txt", status=status, project_id=project_id)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


async def _add_chunks(db, doc, n, term):
    for i in range(n):
        db.add(DocumentChunk(
            document_id=doc.document_id, chunk_index=i,
            content=f"{term} content number {i} discussing {term} topics.",
            chunk_type="text", metadata_fields={"page_number": 1},
        ))
    await db.commit()


async def _cleanup(db, users, docs):
    for d in docs:
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == d.document_id))
        await db.execute(delete(Document).where(Document.document_id == d.document_id))
    for u in users:
        await db.execute(delete(User).where(User.user_id == u.user_id))
    await db.commit()


@pytest.mark.asyncio
async def test_resolve_scope_intersects_owned(db):
    owner = await _mk_user(db)
    other = await _mk_user(db)
    d1 = await _mk_doc(db, owner)
    foreign = await _mk_doc(db, other)
    try:
        svc = HybridRetrievalService(db)
        # Foreign id supplied → excluded; only owned returned.
        scope = await svc.resolve_scope(owner.user_id, document_ids=[d1.document_id, foreign.document_id])
        assert d1.document_id in scope
        assert foreign.document_id not in scope
        # Whole-library (no ids) → all owned only.
        lib = await svc.resolve_scope(owner.user_id)
        assert d1.document_id in lib and foreign.document_id not in lib
    finally:
        await _cleanup(db, [owner, other], [d1, foreign])


@pytest.mark.asyncio
async def test_resolve_scope_by_project(db):
    from proxima.models.core import Project
    owner = await _mk_user(db)
    proj = Project(user_id=owner.user_id, name="Library")
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    pid = proj.project_id
    d_in = await _mk_doc(db, owner, project_id=pid)
    d_out = await _mk_doc(db, owner, project_id=None)
    try:
        svc = HybridRetrievalService(db)
        scope = await svc.resolve_scope(owner.user_id, project_id=pid)
        assert scope == [d_in.document_id]
        assert d_out.document_id not in scope
    finally:
        await _cleanup(db, [owner], [d_in, d_out])


@pytest.mark.asyncio
async def test_multi_document_retrieval_and_per_doc_cap(db):
    owner = await _mk_user(db)
    d1 = await _mk_doc(db, owner)
    d2 = await _mk_doc(db, owner)
    await _add_chunks(db, d1, 5, "alpha")
    await _add_chunks(db, d2, 5, "alpha")
    try:
        svc = HybridRetrievalService(db)
        results = await svc.search(
            "alpha", user_id=owner.user_id,
            document_ids=[d1.document_id, d2.document_id],
            limit=8, per_document_cap=2, candidate_pool=50,
        )
        assert results
        # Per-document cap respected.
        from collections import Counter
        counts = Counter(r["document_id"] for r in results)
        assert all(c <= 2 for c in counts.values())
        # Both documents represented (no single doc dominates).
        assert len(counts) == 2
        # Provenance present for cross-document citations.
        for r in results:
            assert r["document_id"] and "document_title" in r and "page_number" in r and r["chunk_id"]
    finally:
        await _cleanup(db, [owner], [d1, d2])


@pytest.mark.asyncio
async def test_foreign_document_excluded_from_search(db):
    owner = await _mk_user(db)
    other = await _mk_user(db)
    d_own = await _mk_doc(db, owner)
    d_foreign = await _mk_doc(db, other)
    await _add_chunks(db, d_own, 2, "beta")
    await _add_chunks(db, d_foreign, 2, "beta")
    try:
        svc = HybridRetrievalService(db)
        # Even though the foreign id is explicitly requested, it must never be searched.
        results = await svc.search(
            "beta", user_id=owner.user_id,
            document_ids=[d_own.document_id, d_foreign.document_id], limit=8,
        )
        assert results
        assert all(r["document_id"] == str(d_own.document_id) for r in results)
    finally:
        await _cleanup(db, [owner, other], [d_own, d_foreign])


@pytest.mark.asyncio
async def test_single_document_backwards_compatible(db):
    owner = await _mk_user(db)
    d1 = await _mk_doc(db, owner)
    await _add_chunks(db, d1, 3, "gamma")
    try:
        svc = HybridRetrievalService(db)
        results = await svc.search("gamma", user_id=owner.user_id, document_ids=[d1.document_id], limit=5)
        assert results
        assert all(r["document_id"] == str(d1.document_id) for r in results)
    finally:
        await _cleanup(db, [owner], [d1])
