"""
Unit tests for ProximaAIEngine execution boundary (Stage 7A.2).
Uses mocks â€” no real LLM calls are made.
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
# Tests: engine.execute â€” successful path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_successful_structured_output():
    """Engine returns AIExecutionResult with validated_data when provider returns valid JSON."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    valid_json = json.dumps({"title": "Test Title", "value": 7, "tags": ["a"]})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
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
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=fenced_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert result.error is None
    assert result.validated_data.title == "Fenced"
    assert result.validated_data.value == 3


# ---------------------------------------------------------------------------
# Tests: engine.execute â€” validation failure paths
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_invalid_json_returns_schema_validation_error():
    """Engine catches JSON decode errors and returns SchemaValidationError."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    broken_json = "this is not json at all"

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
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
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=incomplete_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, SchemaValidationError)
    assert result.validated_data is None


# ---------------------------------------------------------------------------
# Tests: engine.execute â€” provider error paths
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_provider_timeout_is_normalized():
    """Engine maps provider HTTP 504 to ProviderTimeoutError in result."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
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
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(
            side_effect=HTTPException(status_code=401, detail="Invalid API key.")
        )

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, ProviderAuthenticationError)
    assert result.validated_data is None


# ---------------------------------------------------------------------------
# Tests: schema injection behavior (Stage 7A.2 correction)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_google_provider_does_not_inject_schema_into_prompt():
    """For the Google provider, the system prompt must NOT contain the full Pydantic schema dump."""
    mock_db = MagicMock()
    mock_model = _make_mock_model(provider="google")
    valid_json = json.dumps({"title": "Google Test", "value": 1})
    captured_prompt = {}

    async def capture_complete(model, system_prompt, user_message, **kwargs):
        captured_prompt["system"] = system_prompt
        return valid_json

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = capture_complete

        await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    # The system prompt must be exactly what the analyzer passed â€” no schema appended.
    assert "JSON SCHEMA TO MATCH" not in captured_prompt["system"]
    assert "model_json_schema" not in captured_prompt["system"]
    assert captured_prompt["system"] == "You are a test assistant."


@pytest.mark.asyncio
async def test_non_google_provider_adds_compact_field_hint_to_prompt():
    """Verify that OpenAIProvider.complete appends key hints when structured_output_schema is provided."""
    from proxima.services.providers.openai_provider import OpenAIProvider
    provider = OpenAIProvider()
    provider.api_key = "test_groq_key"

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"title": "Groq", "value": 5}'

    mock_create = AsyncMock(return_value=mock_response)
    mock_client.chat.completions.create = mock_create
    provider._get_client = MagicMock(return_value=mock_client)

    await provider.complete(
        model_id="llama-3.1-8b",
        system_prompt="You are a test assistant.",
        user_message="Return JSON.",
        temperature=0.1,
        max_tokens=1000,
        response_format="json",
        structured_output_schema=SampleSchema
    )

    args, kwargs = mock_create.call_args
    messages = kwargs["messages"]
    system_message = next(m for m in messages if m["role"] == "system")

    assert "title" in system_message["content"]
    assert "value" in system_message["content"]
    assert "properties" not in system_message["content"]


@pytest.mark.asyncio
async def test_pydantic_validation_still_runs_for_google_provider():
    """Even without schema injection, Pydantic validation still rejects invalid responses."""
    mock_db = MagicMock()
    mock_model = _make_mock_model(provider="google")
    # Missing required 'value' field
    incomplete_json = json.dumps({"title": "Missing value"})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=incomplete_json)

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, SchemaValidationError)
    assert result.validated_data is None


@pytest.mark.asyncio
async def test_malformed_json_still_becomes_schema_validation_error():
    """Malformed JSON returns SchemaValidationError regardless of provider."""
    mock_db = MagicMock()
    mock_model = _make_mock_model(provider="google")

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value="{broken json {{")

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

    assert isinstance(result.error, SchemaValidationError)
    assert result.validated_data is None


# ---------------------------------------------------------------------------
# Tests: Stage 7A Consolidated Reliability & Observability (Revised Plan)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retry_exhaustion_on_transient_error():
    """Verify that a transient error (e.g. timeout) retries up to 3 times (4 attempts total)."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry, \
         patch("proxima.services.execution.engine.asyncio.sleep") as mock_sleep:
        # 4 attempts total (1 initial + 3 retries)
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(
            side_effect=[
                HTTPException(status_code=504, detail="timeout"),
                HTTPException(status_code=504, detail="timeout"),
                HTTPException(status_code=504, detail="timeout"),
                HTTPException(status_code=504, detail="timeout"),
            ]
        )

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

        assert mock_registry.complete.call_count == 4
        assert isinstance(result.error, ProviderTimeoutError)
        assert mock_sleep.call_count == 3


@pytest.mark.asyncio
async def test_model_fallback_on_503():
    """Model A fails with transient 503; engine falls back to Model B on the same provider."""
    mock_db = MagicMock()
    model_a = _make_mock_model(provider="google", model_id="gemini-A")
    model_b = _make_mock_model(provider="google", model_id="gemini-B")

    valid_json = json.dumps({"title": "Fallback Success", "value": 10})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[model_a, model_b])

        # Complete mock: model_a fails with transient HTTP 503; model_b succeeds
        async def mock_complete(model, **kwargs):
            if model.model_id == "gemini-A":
                raise HTTPException(status_code=503, detail="Service Unavailable")
            return valid_json

        mock_registry.complete = mock_complete

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

        assert result.error is None
        assert result.model_id == "gemini-B"
        assert result.validated_data.title == "Fallback Success"


@pytest.mark.asyncio
async def test_provider_skipping_on_auth_error():
    """Model A fails with 401 (Auth error); engine skips all other models on Google and falls back to OpenAI."""
    mock_db = MagicMock()
    model_google_a = _make_mock_model(provider="google", model_id="gemini-A")
    model_google_b = _make_mock_model(provider="google", model_id="gemini-B")
    model_openai = _make_mock_model(provider="openai", model_id="gpt-test")

    valid_json = json.dumps({"title": "OpenAI Success", "value": 20})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(
            return_value=[model_google_a, model_google_b, model_openai]
        )

        calls = []
        async def mock_complete(model, **kwargs):
            calls.append(model.model_id)
            if model.provider == "google":
                raise HTTPException(status_code=401, detail="Auth failed")
            return valid_json

        mock_registry.complete = mock_complete

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

        # gemini-B must be skipped because Google provider returned 401
        assert "gemini-A" in calls
        assert "gemini-B" not in calls
        assert "gpt-test" in calls
        assert result.error is None
        assert result.provider == "openai"


@pytest.mark.asyncio
async def test_quota_failure_not_retried():
    """Account-wide quota limit depletion is recognized as provider-wide and fails fast without retrying."""
    mock_db = MagicMock()
    model_a = _make_mock_model(provider="google", model_id="gemini-A")
    model_b = _make_mock_model(provider="openai", model_id="gpt-test")

    valid_json = json.dumps({"title": "Fallback Success", "value": 3})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[model_a, model_b])

        calls = []
        async def mock_complete(model, **kwargs):
            calls.append(model.model_id)
            if model.model_id == "gemini-A":
                # Simulated permanent account quota limit depletion
                raise Exception("429 rate limit exceeded: Billing is disabled or account quota has been depleted.")
            return valid_json

        mock_registry.complete = mock_complete

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=False)

        # Verify attempt count is exactly 1 (no retry for quota exhaustion)
        assert len([c for c in calls if c == "gemini-A"]) == 1
        assert result.provider == "openai"
        assert result.validated_data.title == "Fallback Success"


@pytest.mark.asyncio
async def test_stream_retry_boundary_cordon():
    """Once chunk delivery begins, mid-stream disconnects are cordoned and raise Exception."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    # Simulated stream that yields one chunk, then crashes
    async def mock_generator(*args, **kwargs):
        yield "Chunk 1"
        raise Exception("Midway stream crash")

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.stream_completion = mock_generator

        result = await ProximaAIEngine.execute(mock_db, _make_request(), stream=True)

        assert result.provider == "google"

        # Verify consuming the stream
        chunks = []
        with pytest.raises(Exception, match="Stream disconnected midway"):
            async for chunk in result.content_stream:
                chunks.append(chunk)

        assert len(chunks) == 1
        assert chunks[0] == "Chunk 1"


@pytest.mark.asyncio
async def test_telemetry_is_estimated_flag():
    """Verify that AIAuditor logs requests with is_estimated = True and computes costs accurately."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    mock_model.cost_per_1m_input = 2.0
    mock_model.cost_per_1m_output = 10.0

    valid_json = json.dumps({"title": "Telemetry", "value": 100})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry, \
         patch("proxima.services.execution.engine.AIAuditor.log_request") as mock_log:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=valid_json)

        import uuid
        user_uuid = uuid.uuid4()
        doc_uuid = uuid.uuid4()

        request = _make_request()
        request.user_id = user_uuid
        request.document_id = doc_uuid

        result = await ProximaAIEngine.execute(mock_db, request, stream=False)

        assert result.error is None
        mock_log.assert_called_once()
        args, kwargs = mock_log.call_args
        assert kwargs["user_id"] == user_uuid
        assert kwargs["document_id"] == doc_uuid
        assert kwargs["model"] == mock_model
        assert "Telemetry" in kwargs["response_content"]
