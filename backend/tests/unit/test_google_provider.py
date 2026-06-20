import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from proxima.services.providers.google_provider import GoogleProvider
from fastapi import HTTPException

@pytest.fixture
def provider():
    # Force api_key for tests so it bypasses early 401
    provider = GoogleProvider()
    provider.api_key = "test_key"
    return provider

@pytest.mark.asyncio
async def test_complete_success(provider):
    mock_model = MagicMock()
    mock_response = AsyncMock()
    mock_response.text = "Hello from mock Gemini"
    mock_model.generate_content_async.return_value = mock_response

    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        result = await provider.complete("gemini-2.5-flash", "Sys prompt", "User msg", 0.7, 1000)
        assert result == "Hello from mock Gemini"

@pytest.mark.asyncio
async def test_complete_timeout(provider):
    mock_model = MagicMock()
    mock_model.generate_content_async.side_effect = asyncio.TimeoutError()

    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        with pytest.raises(HTTPException) as exc:
            await provider.complete("gemini-2.5-flash", "Sys prompt", "User msg", 0.7, 1000)
        assert exc.value.status_code == 504

@pytest.mark.asyncio
async def test_stream_completion_success(provider):
    mock_model = MagicMock()
    
    # Mocking the async generator for stream
    async def mock_stream():
        class Chunk:
            def __init__(self, text):
                self.text = text
        yield Chunk("Hello ")
        yield Chunk("World")

    mock_model.generate_content_async.return_value = mock_stream()

    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        chunks = []
        async for chunk in provider.stream_completion("gemini-2.5-flash", "Sys prompt", "User msg", 0.7, 1000):
            chunks.append(chunk)
            
        assert chunks == ["Hello ", "World"]

@pytest.mark.asyncio
async def test_provider_missing_key():
    provider = GoogleProvider()
    provider.api_key = None
    
    with pytest.raises(HTTPException) as exc:
        await provider.complete("gemini-2.5-flash", "Sys prompt", "User msg", 0.7, 1000)
    assert exc.value.status_code == 401
