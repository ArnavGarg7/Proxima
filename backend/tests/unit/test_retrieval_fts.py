import pytest
from proxima.services.retrieval_fts import FTSRetrievalService

@pytest.fixture
def fts_service():
    # Mocking DB session for unit test of packaging
    return FTSRetrievalService(db_session=None)

def test_build_context_package_empty(fts_service):
    assert fts_service.build_context_package([]) == "No relevant context found."

def test_build_context_package_sorting(fts_service):
    # Pass out-of-order chunks to see if it sorts them by rank descending
    chunks = [
        {"chunk_id": "1", "document_id": "doc1", "chunk_index": 0, "content": "Low relevance", "rank": 0.1},
        {"chunk_id": "2", "document_id": "doc1", "chunk_index": 1, "content": "High relevance", "rank": 0.9},
        {"chunk_id": "3", "document_id": "doc1", "chunk_index": 2, "content": "Medium relevance", "rank": 0.5},
    ]
    
    package = fts_service.build_context_package(chunks)
    
    # Excerpt 1 should be High relevance
    assert "Excerpt 1" in package
    assert "High relevance" in package
    assert package.index("High relevance") < package.index("Medium relevance")
    assert package.index("Medium relevance") < package.index("Low relevance")

@pytest.mark.asyncio
async def test_search_fts_execution(db):
    from proxima.models.core import Document, DocumentChunk, User
    from sqlalchemy import select
    
    result = await db.execute(select(User).limit(1))
    user = result.scalar_first()
    if not user:
        user = User(email="fts@example.com", name="FTS User")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    # 1. Create a dummy document
    doc = Document(user_id=user.user_id, title="search_test.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # 2. Insert chunks
    chunk1 = DocumentChunk(document_id=doc.document_id, chunk_index=0, content="The quick brown fox jumps over the lazy dog.", chunk_type="text")
    chunk2 = DocumentChunk(document_id=doc.document_id, chunk_index=1, content="PostgreSQL full text search is powerful.", chunk_type="text")
    db.add(chunk1)
    db.add(chunk2)
    await db.commit()
    
    fts = FTSRetrievalService(db)
    
    # 3. Perform search
    results = await fts.search("PostgreSQL search")
    
    assert len(results) > 0
    assert results[0]["content"] == "PostgreSQL full text search is powerful."
    assert results[0]["rank"] > 0.0
