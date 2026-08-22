"""
Integration tests for Hybrid Retrieval & Grounding (Stage 7B).
"""
import pytest
import uuid
import json
from httpx import AsyncClient
from sqlalchemy import select
from proxima.models.core import User, Document, DocumentChunk

@pytest.mark.asyncio
async def test_multi_tenant_isolation_boundary(db):
    # 1. Setup two users — use random IDs to avoid unique constraint violations on reruns
    suffix = uuid.uuid4().hex[:8]
    user_a = User(email=f"usera_{suffix}@example.com", name="User A")
    user_b = User(email=f"userb_{suffix}@example.com", name="User B")
    db.add_all([user_a, user_b])
    await db.commit()
    await db.refresh(user_a)
    await db.refresh(user_b)
    
    # 2. Setup document owned by B
    doc_b = Document(user_id=user_b.user_id, title="secret_b.txt", status="processed")
    db.add(doc_b)
    await db.commit()
    await db.refresh(doc_b)
    
    chunk_b = DocumentChunk(
        document_id=doc_b.document_id,
        chunk_index=0,
        content="Secret financial codes: 456789.",
        chunk_type="text"
    )
    db.add(chunk_b)
    await db.commit()
    
    # 3. Call HybridRetrievalService with user_a scope trying to query doc_b
    from proxima.services.retrieval_hybrid import HybridRetrievalService
    retrieval = HybridRetrievalService(db)
    
    # Attempt 1: Querying specific doc_b ID
    results = await retrieval.search("secret", user_id=user_a.user_id, document_ids=[doc_b.document_id])
    # Must be empty because user A does not own doc B
    assert results == []
    
    # Attempt 2: Library-scoped search for user A
    results_all = await retrieval.search("secret", user_id=user_a.user_id)
    # Must be empty because user A has no documents
    assert results_all == []

@pytest.mark.asyncio
async def test_complete_hybrid_endpoint_streaming(client: AsyncClient, db):
    # 1. Fetch the user the auth override authenticates as (role="user"), so the
    #    document is owned by the requesting user (an unfiltered LIMIT 1 can pick
    #    an admin user first on a fresh DB and yield 403).
    stmt = select(User).where(User.role == "user").limit(1)
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        user = User(email="test_router@example.com", name="Router User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # 2. Create document owned by user
    doc = Document(user_id=user.user_id, title="contract.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    chunk = DocumentChunk(
        document_id=doc.document_id,
        chunk_index=0,
        content="The agreement shall begin on October 1st, 2026.",
        chunk_type="text",
        metadata_fields={"page_number": 1}
    )
    db.add(chunk)
    await db.commit()

    # 3. Execute request to /complete
    payload = {
        "document_id": str(doc.document_id),
        "user_task": "When does the agreement begin?",
        "max_tokens": 50,
        "temperature": 0.1
    }
    
    # We mock LLM response generation in the engine to guarantee it cites Ref 1
    from unittest.mock import patch, MagicMock
    mock_stream = MagicMock()
    # Async iterator yielding chunks
    async def mock_async_iter():
        yield "According to the contract, the agreement begins on October 1st, 2026 [Ref 1]."
        
    mock_stream.content_stream = mock_async_iter()
    mock_stream.provider = "google"
    mock_stream.model_id = "gemini-2.5-flash"

    with patch("proxima.services.execution.engine.ProximaAIEngine.execute", return_value=mock_stream):
        response = await client.post("/api/intelligence/complete", json=payload)
        assert response.status_code == 200
        
        # Read the streaming SSE response lines
        lines = []
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                lines.append(json.loads(data_str))
                
        # We expect a 'chunk' type, a 'qhe' type, and a 'grounding' type
        types = [l["type"] for l in lines]
        assert "chunk" in types
        assert "qhe" in types
        assert "grounding" in types
        
        # Grounding data checks
        grounding_data = next(l for l in lines if l["type"] == "grounding")
        assert grounding_data["eval"]["grounding_status"] == "grounded"
        assert len(grounding_data["citations"]) == 1
        assert grounding_data["citations"][0]["document_title"] == "contract.txt"
        assert grounding_data["citations"][0]["page_number"] == 1
