"""Stage 7G: DB-backed vector-retrieval integration test.

Unlike test_hybrid_retrieval.py (which mocks db.execute and so never exercises
the pgvector query binding), this seeds real chunks with real 768-dim vectors in
the container Postgres and runs HybridRetrievalService.search against them. It
proves the actual `(:qv)::vector` binding works and that vector results
participate in RRF — the exact path that silently failed before Stage 7G — while
keeping FTS-only fallback intact.

The query embedding is a deterministic synthetic vector (no provider call).
"""
import uuid

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, delete

from proxima.models.core import User, Document, DocumentChunk
from proxima.services.retrieval_hybrid import HybridRetrievalService

VEC_PATH = "proxima.services.retrieval_hybrid.generate_chunk_embedding"


def _onehot(pos: int):
    """A deterministic, unit-length 768-vector (one-hot at `pos`)."""
    v = [0.0] * 768
    v[pos % 768] = 1.0
    return v


@pytest.mark.asyncio
async def test_vector_participates_in_rrf_and_fts_fallback(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(email=f"vec_{suffix}@example.com", name="Vector User")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    doc = Document(user_id=user.user_id, title=f"vec_{suffix}.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    contents = [
        "alpha vector database chunk one",
        "beta semantic search chunk two",
        "gamma retrieval fusion chunk three",
    ]
    for i, content in enumerate(contents):
        db.add(DocumentChunk(
            document_id=doc.document_id,
            chunk_index=i,
            content=content,
            chunk_type="text",
            embedding=_onehot(i),
            embedding_model="gemini-embedding-001",
            embedding_dimensions=768,
            metadata_fields={"page_number": i + 1},
        ))
    await db.commit()

    try:
        svc = HybridRetrievalService(db)

        # Dimension correctness: the stored vector round-trips at 768.
        stored = (await db.execute(
            select(DocumentChunk).where(
                DocumentChunk.document_id == doc.document_id,
                DocumentChunk.chunk_index == 0,
            )
        )).scalar_one()
        assert len(list(stored.embedding)) == 768

        # Hybrid: query text FTS-matches "alpha" AND the (synthetic) query vector
        # aligns with chunk 0 — so BOTH paths must contribute.
        with patch(VEC_PATH, new=AsyncMock(return_value=_onehot(0))):
            results = await svc.search(
                "alpha", user_id=user.user_id, document_ids=[doc.document_id], limit=5
            )
        assert results, "hybrid search returned no results"
        assert any(r.get("vector_rank") is not None for r in results), \
            "vector path did not participate in RRF"
        assert any(r.get("fts_rank") is not None for r in results), \
            "FTS path did not participate"

        # FTS-only fallback: no query vector -> vector path empty, FTS still works.
        with patch(VEC_PATH, new=AsyncMock(return_value=None)):
            fts_only = await svc.search(
                "alpha", user_id=user.user_id, document_ids=[doc.document_id], limit=5
            )
        assert fts_only, "FTS-only fallback returned nothing"
        assert all(r.get("vector_rank") is None for r in fts_only), \
            "vector must not participate when no query embedding is available"
        assert any(r.get("fts_rank") is not None for r in fts_only)
    finally:
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.document_id))
        await db.execute(delete(Document).where(Document.document_id == doc.document_id))
        await db.execute(delete(User).where(User.user_id == user.user_id))
        await db.commit()
