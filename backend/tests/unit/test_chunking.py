import pytest
from proxima.services.chunking import ChunkingService

@pytest.fixture
def chunking_service():
    return ChunkingService(chunk_size=50, chunk_overlap=10)

def test_chunk_empty_text(chunking_service):
    assert chunking_service.chunk_text("") == []

def test_chunk_short_text(chunking_service):
    text = "Short text"
    chunks = chunking_service.chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text

def test_chunk_long_text(chunking_service):
    # Create a string of 100 characters
    text = "A" * 100
    chunks = chunking_service.chunk_text(text)
    
    # Chunk 1: 50 chars. Starts at 0, ends at 50.
    # Chunk 2: starts at 40 (50-10), ends at 90.
    # Chunk 3: starts at 80 (90-10), ends at 130 -> cut to 100.
    
    assert len(chunks) == 3
    assert len(chunks[0]) == 50
    assert len(chunks[1]) == 50
    assert len(chunks[2]) == 20

def test_chunk_with_natural_breaks():
    # Service with chunk_size 20, overlap 5
    service = ChunkingService(chunk_size=20, chunk_overlap=5)
    text = "This is a sentence. And another one."
    # len is 36.
    # Chunk 1 aim: 20 chars -> "This is a sentence. "
    # But it looks for space backwards. At idx 19 it is 'e', last space is at 19 ("This is a sentence. "). 
    # Let's see exactly how it breaks.
    
    chunks = service.chunk_text(text)
    assert len(chunks) > 1
    assert "This is a sentence." in chunks[0] or "This is a" in chunks[0]
