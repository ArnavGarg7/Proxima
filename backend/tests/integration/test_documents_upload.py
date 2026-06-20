import pytest
from httpx import AsyncClient
import io

@pytest.mark.asyncio
async def test_document_upload_success(client: AsyncClient):
    # Fake PDF file content
    content = b"%PDF-1.4\n%Fake PDF content for integration test"
    files = {"file": ("test_doc.pdf", content, "application/pdf")}
    
    response = await client.post("/api/documents/upload", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "File uploaded successfully"
    assert "document_id" in data
    assert "file_uri" in data
    assert str(data["file_uri"]).endswith(".pdf")

@pytest.mark.asyncio
async def test_document_upload_invalid_extension(client: AsyncClient):
    content = b"Some executable content"
    files = {"file": ("test.exe", content, "application/x-msdownload")}
    
    response = await client.post("/api/documents/upload", files=files)
    
    assert response.status_code == 415
    assert "Unsupported file extension" in response.json()["detail"]

@pytest.mark.asyncio
async def test_document_upload_magic_mismatch(client: AsyncClient):
    # Try to upload a text file masquerading as a PDF
    content = b"I am definitely not a PDF file."
    files = {"file": ("fake.pdf", content, "application/pdf")}
    
    response = await client.post("/api/documents/upload", files=files)
    
    # Validation should catch magic byte mismatch
    assert response.status_code == 415
    assert "Unsupported MIME" in response.json()["detail"] or "magic byte mismatch" in response.json()["detail"]
