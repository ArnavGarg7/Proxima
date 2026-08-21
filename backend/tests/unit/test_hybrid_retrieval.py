"""
Unit tests for HybridRetrievalService (Stage 7B).
"""
import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from proxima.services.retrieval_hybrid import HybridRetrievalService
from proxima.models.core import Document, DocumentChunk

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.mark.asyncio
async def test_hybrid_retrieval_empty_query(mock_db):
    service = HybridRetrievalService(mock_db)
    result = await service.search("", uuid.uuid4())
    assert result == []

@pytest.mark.asyncio
async def test_hybrid_retrieval_empty_scope(mock_db):
    # Mock database executing allowed documents check and finding none
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    service = HybridRetrievalService(mock_db)
    result = await service.search("query text", uuid.uuid4())
    assert result == []

@pytest.mark.asyncio
async def test_hybrid_retrieval_rrf_scoring(mock_db):
    user_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    
    # 1. Mock DB queries for scope check and titles
    mock_db.execute = AsyncMock()
    
    # FTS results (row objects)
    fts_mock = [
        MagicMock(chunk_id="chunk_1", document_id=doc_id, chunk_index=0, content="Match A", metadata_fields={"page_number": 2}),
        MagicMock(chunk_id="chunk_2", document_id=doc_id, chunk_index=1, content="Match B", metadata_fields={"page_number": 3})
    ]
    # Vector results (row objects)
    vec_mock = [
        MagicMock(chunk_id="chunk_2", document_id=doc_id, chunk_index=1, content="Match B", metadata_fields={"page_number": 3}),
        MagicMock(chunk_id="chunk_1", document_id=doc_id, chunk_index=0, content="Match A", metadata_fields={"page_number": 2})
    ]
    
    # Mocking different queries
    async def mock_execute_side_effect(statement, params=None):
        stmt_str = str(statement).lower()
        mock_result = MagicMock()
        if "from documents" in stmt_str:
            mock_result.all.return_value = [(doc_id, "Test Document")]
        elif "ts_rank" in stmt_str:
            mock_result.fetchall.return_value = fts_mock
        elif "embedding <=>" in stmt_str:
            mock_result.fetchall.return_value = vec_mock
        return mock_result
        
    mock_db.execute.side_effect = mock_execute_side_effect
    
    with patch("proxima.services.retrieval_hybrid.generate_chunk_embedding") as mock_emb:
        mock_emb.return_value = [0.1] * 768
        
        service = HybridRetrievalService(mock_db)
        results = await service.search("match query", user_id, document_ids=[doc_id])
        
        assert len(results) == 2
        # RRF calculations:
        # chunk_1 (FTS: #1, Vector: #2) -> score = 1/61 + 1/62
        # chunk_2 (FTS: #2, Vector: #1) -> score = 1/62 + 1/61
        # Both chunks have equal score, so order depends on sort stability, but they are both retrieved.
        assert results[0]["chunk_id"] in ["chunk_1", "chunk_2"]
        assert results[0]["document_title"] == "Test Document"
        assert results[0]["page_number"] in [2, 3]

@pytest.mark.asyncio
async def test_hybrid_retrieval_fts_only_fallback(mock_db):
    user_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    
    # Mock vector query returning empty due to NULL embeddings
    mock_db.execute = AsyncMock()
    
    fts_mock = [
        MagicMock(chunk_id="chunk_1", document_id=doc_id, chunk_index=0, content="Match A", metadata_fields={"page_number": 1})
    ]
    
    async def mock_execute_side_effect(statement, params=None):
        stmt_str = str(statement).lower()
        mock_result = MagicMock()
        if "from documents" in stmt_str:
            mock_result.all.return_value = [(doc_id, "Test Document")]
        elif "ts_rank" in stmt_str:
            mock_result.fetchall.return_value = fts_mock
        elif "embedding <=>" in stmt_str:
            mock_result.fetchall.return_value = []
        return mock_result
        
    mock_db.execute.side_effect = mock_execute_side_effect
    
    with patch("proxima.services.retrieval_hybrid.generate_chunk_embedding") as mock_emb:
        # Mock returns None for embedding generator
        mock_emb.return_value = None
        
        service = HybridRetrievalService(mock_db)
        results = await service.search("match query", user_id, document_ids=[doc_id])
        
        # Should gracefully fall back to FTS only
        assert len(results) == 1
        assert results[0]["chunk_id"] == "chunk_1"
        assert results[0]["score"] == 1.0 / 61.0
