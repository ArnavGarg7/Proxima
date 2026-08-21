import math
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
    mock_response = MagicMock()
    mock_response.text = "Hello from mock Gemini"
    mock_model.generate_content_async = AsyncMock(return_value=mock_response)

    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        result = await provider.complete("gemini-2.5-flash", "Sys prompt", "User msg", 0.7, 1000)
        assert result == "Hello from mock Gemini"

@pytest.mark.asyncio
async def test_complete_timeout(provider):
    mock_model = MagicMock()
    mock_model.generate_content_async = AsyncMock(side_effect=asyncio.TimeoutError())

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

    mock_model.generate_content_async = AsyncMock(return_value=mock_stream())

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


# ── get_embedding (Stage 7G regression cover) ───────────────────────────────
# Guards the embedding fix: the served model requires an explicit
# output_dimensionality (768) to fit the vector(768) column, and Google does not
# L2-normalize sub-3072 output — so the provider must normalize it. These mock
# the SDK; no real provider call is made.

@pytest.mark.asyncio
async def test_get_embedding_passes_output_dimensionality_and_normalizes(provider):
    mock_embed = AsyncMock(return_value={"embedding": [3.0, 4.0]})
    with patch("google.generativeai.embed_content_async", mock_embed):
        result = await provider.get_embedding(
            "gemini-embedding-001", "hello", output_dimensionality=2
        )

    # [3,4] with L2 norm 5 -> [0.6, 0.8]
    assert result == pytest.approx([0.6, 0.8])
    kwargs = mock_embed.call_args.kwargs
    assert kwargs["model"] == "models/gemini-embedding-001"
    assert kwargs["content"] == "hello"
    assert kwargs["task_type"] == "retrieval_document"
    assert kwargs["output_dimensionality"] == 2


@pytest.mark.asyncio
async def test_get_embedding_without_dimensionality_is_not_normalized(provider):
    mock_embed = AsyncMock(return_value={"embedding": [3.0, 4.0]})
    with patch("google.generativeai.embed_content_async", mock_embed):
        result = await provider.get_embedding("gemini-embedding-001", "hello")

    # No output_dimensionality requested -> pass through untouched, no normalize.
    assert result == [3.0, 4.0]
    assert "output_dimensionality" not in mock_embed.call_args.kwargs


@pytest.mark.asyncio
async def test_get_embedding_768_is_unit_normalized(provider):
    raw = [1.0] * 768
    mock_embed = AsyncMock(return_value={"embedding": raw})
    with patch("google.generativeai.embed_content_async", mock_embed):
        result = await provider.get_embedding(
            "gemini-embedding-001", "hi", output_dimensionality=768
        )

    assert len(result) == 768
    assert math.sqrt(sum(x * x for x in result)) == pytest.approx(1.0, abs=1e-6)


@pytest.mark.asyncio
async def test_get_embedding_missing_key_raises_401():
    provider = GoogleProvider()
    provider.api_key = None
    with pytest.raises(HTTPException) as exc:
        await provider.get_embedding("gemini-embedding-001", "hi", output_dimensionality=768)
    assert exc.value.status_code == 401
