import pytest
from fastapi import UploadFile, HTTPException
from proxima.services.upload_security import UploadSecurityService
import io
from starlette.datastructures import Headers

@pytest.fixture
def security_service():
    return UploadSecurityService(max_file_size_bytes=100) # tiny limit for testing

@pytest.mark.asyncio
async def test_valid_upload_text(security_service):
    file = UploadFile(filename="test.txt", file=io.BytesIO(b"Hello world"), headers=Headers({"content-type": "text/plain"}))
    
    result = await security_service.validate_upload(file)
    assert result is True

@pytest.mark.asyncio
async def test_invalid_extension(security_service):
    file = UploadFile(filename="test.exe", file=io.BytesIO(b"MZ..."), headers=Headers({"content-type": "application/x-msdownload"}))
    
    with pytest.raises(HTTPException) as exc:
        await security_service.validate_upload(file)
    assert exc.value.status_code == 415
    assert "Unsupported file extension" in exc.value.detail

@pytest.mark.asyncio
async def test_oversized_file(security_service):
    file = UploadFile(filename="big.txt", file=io.BytesIO(b"x" * 200), headers=Headers({"content-type": "text/plain"}))
    
    with pytest.raises(HTTPException) as exc:
        await security_service.validate_upload(file)
    assert exc.value.status_code == 413
    assert "exceeds maximum size" in exc.value.detail

@pytest.mark.asyncio
async def test_magic_byte_mismatch(security_service):
    # Extension is pdf, but content is just random binary bytes
    file = UploadFile(filename="fake.pdf", file=io.BytesIO(b"\x00\x01\x02\x03\x04\x05"), headers=Headers({"content-type": "application/pdf"}))
    
    with pytest.raises(HTTPException) as exc:
        await security_service.validate_upload(file)
    assert exc.value.status_code == 415
    assert "magic byte mismatch" in exc.value.detail or "Unsupported MIME" in exc.value.detail

@pytest.mark.asyncio
async def test_valid_pdf_magic_bytes(security_service):
    # Genuine PDF start
    file = UploadFile(filename="real.pdf", file=io.BytesIO(b"%PDF-1.4\n..."), headers=Headers({"content-type": "application/pdf"}))
    
    result = await security_service.validate_upload(file)
    assert result is True
