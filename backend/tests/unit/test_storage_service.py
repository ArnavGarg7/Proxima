import pytest
import os
import io
import shutil
from proxima.services.storage_service import StorageService

TEST_STORAGE_DIR = "./test_storage"

@pytest.fixture
def storage_service():
    service = StorageService(base_storage_path=TEST_STORAGE_DIR)
    yield service
    if os.path.exists(TEST_STORAGE_DIR):
        shutil.rmtree(TEST_STORAGE_DIR)

@pytest.mark.asyncio
async def test_save_and_get_file(storage_service):
    file_id = "1234-5678"
    original_filename = "test_doc.txt"
    content = b"Storage test content"
    stream = io.BytesIO(content)

    # Test Save
    uri = await storage_service.save_file(file_id, stream, original_filename)
    assert uri.endswith(".txt")
    assert os.path.exists(uri)

    # Test Retrieve
    retrieved_stream = await storage_service.get_file(uri)
    assert retrieved_stream.read() == content
    retrieved_stream.close()

@pytest.mark.asyncio
async def test_delete_file(storage_service):
    file_id = "abcd-efgh"
    stream = io.BytesIO(b"Delete me")
    uri = await storage_service.save_file(file_id, stream, "delete.pdf")
    
    assert os.path.exists(uri)
    
    result = await storage_service.delete_file(uri)
    assert result is True
    assert not os.path.exists(uri)

    # Delete non-existent
    result = await storage_service.delete_file("non-existent-uri")
    assert result is False

@pytest.mark.asyncio
async def test_get_nonexistent_file(storage_service):
    with pytest.raises(FileNotFoundError):
        await storage_service.get_file("missing_file.txt")
