"""Stage 7G regression cover for the embedding backfill tool
(scripts/backfill_embeddings.py).

These are DB-backed (real container Postgres via the `db` fixture) but never call
a real provider — `generate_chunk_embedding` is monkeypatched. The fake returns a
vector ONLY for this test's uniquely-marked chunks and None for everything else,
so any unrelated NULL-embedding rows in the shared dev DB are left untouched.

Covered:
- successful backfill writes 768-dim vectors + versioning fields
- idempotency: a second run processes zero already-embedded chunks
- an embedding failure degrades gracefully (row stays NULL) and cannot loop
  forever (the run is wrapped in a timeout that would fail the test on a hang)
"""
import asyncio
import uuid

import pytest
from sqlalchemy import select, delete

from proxima.models.core import User, Document, DocumentChunk
from scripts import backfill_embeddings as bf


def _vec():
    return [0.02] * 768


async def _seed(db, marker, n):
    user = User(email=f"bf_{marker}@example.com", name="Backfill User")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    doc = Document(user_id=user.user_id, title=f"{marker}.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    for i in range(n):
        db.add(DocumentChunk(
            document_id=doc.document_id,
            chunk_index=i,
            content=f"{marker} chunk number {i}",
            chunk_type="text",
        ))
    await db.commit()
    return user, doc


async def _cleanup(db, user, doc):
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.document_id))
    await db.execute(delete(Document).where(Document.document_id == doc.document_id))
    await db.execute(delete(User).where(User.user_id == user.user_id))
    await db.commit()


@pytest.mark.asyncio
async def test_backfill_success_and_idempotent(db, monkeypatch):
    marker = f"BF{uuid.uuid4().hex[:8]}"
    user, doc = await _seed(db, marker, 3)

    calls = []

    async def fake_embed(session, content):
        # Only embed THIS test's chunks; leave any other NULL rows untouched.
        if marker in content:
            calls.append(content)
            return _vec()
        return None

    monkeypatch.setattr(bf, "generate_chunk_embedding", fake_embed)

    try:
        # 1. Successful backfill.
        await asyncio.wait_for(bf.main(limit=None, concurrency=2, batch=50, rpm=0), timeout=60)

        # Read column values (not ORM entities) so we see main()'s committed rows
        # without triggering a lazy refresh on this async session.
        rows = (await db.execute(
            select(
                DocumentChunk.embedding,
                DocumentChunk.embedding_model,
                DocumentChunk.embedding_dimensions,
            ).where(DocumentChunk.document_id == doc.document_id)
        )).all()
        assert len(rows) == 3
        for emb, model, dims in rows:
            assert emb is not None
            assert len(list(emb)) == 768
            assert model == "gemini-embedding-001"
            assert dims == 768
        assert len(calls) == 3

        # 2. Idempotency: a second run must not re-embed already-embedded chunks.
        calls.clear()
        await asyncio.wait_for(bf.main(limit=None, concurrency=2, batch=50, rpm=0), timeout=60)
        assert calls == []
    finally:
        await _cleanup(db, user, doc)


@pytest.mark.asyncio
async def test_backfill_failure_degrades_and_terminates(db, monkeypatch):
    marker = f"BF{uuid.uuid4().hex[:8]}"
    user, doc = await _seed(db, marker, 2)

    attempts = []

    async def always_fail(session, content):
        if marker in content:
            attempts.append(content)
        return None  # terminal failure → generate_chunk_embedding returns None

    monkeypatch.setattr(bf, "generate_chunk_embedding", always_fail)

    try:
        # Must terminate (the timeout would fail the test on an infinite loop).
        await asyncio.wait_for(bf.main(limit=None, concurrency=2, batch=50, rpm=0), timeout=60)

        embeddings = (await db.execute(
            select(DocumentChunk.embedding).where(DocumentChunk.document_id == doc.document_id)
        )).scalars().all()
        # Graceful degradation: failed chunks stay NULL (retrieval falls back to FTS).
        assert len(embeddings) == 2
        assert all(e is None for e in embeddings)
        assert len(attempts) == 2  # each chunk attempted exactly once, no re-loop
    finally:
        await _cleanup(db, user, doc)
