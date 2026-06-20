import pytest
import os
from unittest.mock import MagicMock
from proxima.services.document_ingestion import DocumentIngestionService
from proxima.services.chunking import ChunkingService
from proxima.models.core import Document, DocumentChunk

@pytest.fixture
def chunking_service():
    return ChunkingService(chunk_size=50, chunk_overlap=10)

@pytest.mark.asyncio
async def test_ingestion_text_extraction(chunking_service, db):
    from proxima.models.core import User
    from sqlalchemy import select
    
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        user = User(email="ingest@example.com", name="Ingest User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Setup test DB document
    doc = Document(user_id=user.user_id, title="test.txt", status="uploaded")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # Create test file
    test_file_path = f"./test_{doc.document_id}.txt"
    with open(test_file_path, "w") as f:
        f.write("Hello world! This is a test document.")
        
    service = DocumentIngestionService(chunking_service, db)
    
    result = await service.ingest_document(doc.document_id, test_file_path)
    
    assert result is True
    await db.refresh(doc)
    assert doc.status == "processed"
    
    # Cleanup
    os.remove(test_file_path)

@pytest.mark.asyncio
async def test_ingestion_unsupported_format(chunking_service, db):
    from proxima.models.core import User
    from sqlalchemy import select
    
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        user = User(email="ingest@example.com", name="Ingest User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    doc = Document(user_id=user.user_id, title="test.exe", status="uploaded")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    service = DocumentIngestionService(chunking_service, db)
    
    # Passing an unsupported extension .exe
    result = await service.ingest_document(doc.document_id, "fake.exe")
    
    assert result is False
    await db.refresh(doc)
    assert doc.status == "failed"

@pytest.mark.asyncio
async def test_ingestion_missing_document(chunking_service, db):
    service = DocumentIngestionService(chunking_service, db)
    result = await service.ingest_document("00000000-0000-0000-0000-000000000000", "fake.txt")
    assert result is False
