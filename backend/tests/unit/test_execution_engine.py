"""
Unit tests for ProximaAIEngine execution boundary (Stage 7A.2).
Uses mocks — no real LLM calls are made.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pydantic import BaseModel
from typing import Optional

from proxima.services.execution.engine import (
    ProximaAIEngine,
    AIExecutionRequest,
    AIExecutionResult,
)
from proxima.services.execution.errors import (
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderAuthenticationError,
    SchemaValidationError,
    UnknownExecutionError,
)
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

class SampleSchema(BaseModel):
    title: str
    value: int
    tags: Optional[list] = []


def _make_mock_model(provider="google", model_id="gemini-2.5-flash"):
    model = MagicMock()
    model.provider = provider
    model.model_id = model_id
    return model


def _make_request(schema=SampleSchema):
    return AIExecutionRequest(
        task_class="test_task",
        domain=None,
        system_prompt="You are a test assistant.",
        user_message="Return valid JSON.",
        structured_output_schema=schema,
    )


# ---------------------------------------------------------------------------
# Tests: JSON cleanup / markdown stripping
# ---------------------------------------------------------------------------

def test_clean_json_response_plain():
    raw = '{"title": "Hello", "value": 42}'
    assert ProximaAIEngine._clean_json_response(raw) == raw.strip()


def test_clean_json_response_fenced_json():
    raw = '```json\n{"title": "Hello", "value": 42}\n```'
    result = ProximaAIEngine._clean_json_response(raw)
    assert result == '{"title": "Hello", "value": 42}'


def test_clean_json_response_plain_fence():
    raw = '```\n{"title": "Test", "value": 1}\n```'
    result = ProximaAIEngine._clean_json_response(raw)
    assert result == '{"title": "Test", "value": 1}'


def test_clean_json_response_whitespace():
    raw = '   {"title": "A", "value": 99}   '
    result = ProximaAIEngine._clean_json_response(raw)
    assert result == '{"title": "A", "value": 99}'


# ---------------------------------------------------------------------------
# Tests: error mapping
# ---------------------------------------------------------------------------

def test_map_http_exception_401():
    exc = HTTPException(status_code=401, detail="bad key")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderAuthenticationError)


def test_map_http_exception_403():
    exc = HTTPException(status_code=403, detail="forbidden")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderAuthenticationError)


def test_map_http_exception_429():
    exc = HTTPException(status_code=429, detail="rate limit")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderRateLimitError)


def test_map_http_exception_504():
    exc = HTTPException(status_code=504, detail="timeout")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderTimeoutError)


def test_map_generic_timeout():
    exc = Exception("asyncio timeout occurred")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderTimeoutError)


def test_map_generic_rate_limit():
    exc = Exception("429 rate limit exceeded quota")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, ProviderRateLimitError)


def test_map_unknown_error():
    exc = Exception("something totally weird happened")
    result = ProximaAIEngine._map_http_exception(exc)
    assert isinstance(result, UnknownExecutionError)


# ---------------------------------------------------------------------------
# Tests: engine.execute — successful path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_successful_structured_output():
    """Engine returns AIExecutionResult with validated_data when provider returns valid JSON."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    valid_json = json.dumps({"title": "Test Title", "value": 7, "tags": ["a"]})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(return_value=valid_json)

        request = _make_request()
        result = await ProximaAIEngine.execute(mock_db, request, stream=False)

    assert result.error is None
    assert isinstance(result.validated_data, SampleSchema)
    assert result.validated_data.title == "Test Title"
    assert result.validated_data.value == 7
    assert result.provider == "google"
    assert result.model_id == "gemini-2.5-flash"
    assert result.latency_ms >= 0


@pytest.mark.asyncio
async def test_execute_strips_markdown_fence_before_validation():
    """Engine correctly cleans ```json fences before JSON parsing."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    fenced_json = '```json\n{"title": "Fenced", "value": 3}\n```'

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(return_value=fenced_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert result.error is None
    assert result.validated_data.title == "Fenced"
    assert result.validated_data.value == 3


# ---------------------------------------------------------------------------
# Tests: engine.execute — validation failure paths
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_invalid_json_returns_schema_validation_error():
    """Engine catches JSON decode errors and returns SchemaValidationError."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    broken_json = "this is not json at all"

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(return_value=broken_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, SchemaValidationError)
    assert result.validated_data is None


@pytest.mark.asyncio
async def test_execute_pydantic_validation_failure_returns_schema_validation_error():
    """Engine catches Pydantic validation errors (missing required field)."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    # Missing required 'value' field
    incomplete_json = json.dumps({"title": "Only title"})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(return_value=incomplete_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, SchemaValidationError)
    assert result.validated_data is None


# ---------------------------------------------------------------------------
# Tests: engine.execute — provider error paths
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_provider_timeout_is_normalized():
    """Engine maps provider HTTP 504 to ProviderTimeoutError in result."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(
            side_effect=HTTPException(status_code=504, detail="Provider timeout.")
        )

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, ProviderTimeoutError)
    assert result.validated_data is None


@pytest.mark.asyncio
async def test_execute_provider_auth_error_is_normalized():
    """Engine maps provider HTTP 401 to ProviderAuthenticationError in result."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_for_task = AsyncMock(return_value=mock_model)
        mock_registry.complete = AsyncMock(
            side_effect=HTTPException(status_code=401, detail="Invalid API key.")
        )

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, ProviderAuthenticationError)
    assert result.validated_data is None
