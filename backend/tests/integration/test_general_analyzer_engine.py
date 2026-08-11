"""
Integration tests for GeneralDocumentAnalyzer Stage 7A.2 migration.
Verifies that the analyzer correctly uses ProximaAIEngine and that the
API response shape is identical to the pre-migration shape.
Uses mocks — no real LLM calls are made.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from proxima.services.general_document_analyzer import GeneralDocumentAnalyzer
from proxima.services.execution.errors import SchemaValidationError, ProviderTimeoutError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_TEXT = """
Project Alpha Q3 Report

This report covers the performance of Project Alpha for Q3 2025.
Revenue reached $5.2M, a 12% increase from Q2. 
Action item: Review staffing for Q4.
Next step: Schedule board meeting by October 15, 2025.
"""

SAMPLE_METADATA = {"title": "Project Alpha Q3 Report"}

def _valid_llm_json_response():
    """A valid JSON string matching GeneralAnalysisResult schema."""
    return json.dumps({
        "executive_summary": "Strong Q3 performance with 12% revenue growth.",
        "takeaways": [{"point": "Revenue up 12%", "evidence": [{"quote": "$5.2M", "context": "revenue"}]}],
        "topics": [{"name": "Finance", "description": "Revenue growth", "evidence": []}],
        "entities": [{"name": "Project Alpha", "entity_type": "Project", "context": "main subject"}],
        "dates": [{"date": "October 15, 2025", "significance": "Board meeting", "evidence": []}],
        "numbers": [{"value": "$5.2M", "metric": "Revenue", "context": "Q3 revenue", "evidence": []}],
        "risks": [],
        "actions": [{"action": "Review staffing for Q4", "evidence": []}],
        "metadata": {"reading_time_minutes": 1, "word_count": 50, "language": "en"},
        "confidence": 92,
        "signals": [],
    })


def _make_mock_model(provider="google", model_id="gemini-2.5-flash"):
    model = MagicMock()
    model.provider = provider
    model.model_id = model_id
    return model


# ---------------------------------------------------------------------------
# Tests: Successful execution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_general_analyzer_successful_execution():
    """Analyzer returns correct structured dict when engine succeeds."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=_valid_llm_json_response())

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    # Verify API shape is intact
    assert "executive_summary" in result
    assert "takeaways" in result
    assert "topics" in result
    assert "entities" in result
    assert "dates" in result
    assert "numbers" in result
    assert "risks" in result
    assert "actions" in result
    assert "metadata" in result
    assert "confidence" in result
    assert "signals" in result

    # Verify metadata is populated from deterministic extraction (not from LLM)
    assert result["metadata"]["word_count"] > 0
    assert result["metadata"]["reading_time_minutes"] >= 1
    assert result["confidence"] == 92


@pytest.mark.asyncio
async def test_general_analyzer_api_shape_unchanged():
    """The response dict keys are exactly what the frontend expects (regression guard)."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=_valid_llm_json_response())

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    expected_keys = {
        "executive_summary", "takeaways", "topics", "entities",
        "dates", "numbers", "risks", "actions", "metadata", "confidence", "signals"
    }
    assert set(result.keys()) == expected_keys


@pytest.mark.asyncio
async def test_general_analyzer_deterministic_signals_injected():
    """Deterministic signals (e.g. 'Contains Action Items') are merged into the response."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=_valid_llm_json_response())

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    # The text contains "action item" and "next step" so signal should be added
    assert "Contains Action Items" in result["signals"]


# ---------------------------------------------------------------------------
# Tests: Fallback behavior
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_general_analyzer_fallback_on_schema_validation_error():
    """Analyzer returns safe deterministic fallback when engine returns SchemaValidationError."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    broken_json = "not valid json at all {{ broken"

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=broken_json)

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    # Must be the fallback shape, not an exception
    assert result["confidence"] == 0
    assert result["executive_summary"] == "AI analysis could not be completed. Please try again later or check system status."
    assert result["risks"] == [{"level": "High", "description": "AI Pipeline Unavailable", "evidence": []}]
    assert "Fallback Mode" in result["signals"]


@pytest.mark.asyncio
async def test_general_analyzer_fallback_on_provider_timeout():
    """Analyzer returns safe deterministic fallback when provider times out."""
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(
            side_effect=HTTPException(status_code=504, detail="Provider timeout.")
        )

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    assert result["confidence"] == 0
    assert "Fallback Mode" in result["signals"]
    assert result["actions"] == []


@pytest.mark.asyncio
async def test_general_analyzer_fallback_preserves_metadata():
    """Even in fallback mode, metadata (word_count, reading_time) is populated deterministically."""
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_model = _make_mock_model()

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(
            side_effect=HTTPException(status_code=504, detail="timeout")
        )

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    assert result["metadata"]["word_count"] > 0
    assert result["metadata"]["reading_time_minutes"] >= 1
    assert result["metadata"]["language"] in ("en", "unknown")


@pytest.mark.asyncio
async def test_general_analyzer_fallback_on_pydantic_mismatch():
    """Analyzer falls back safely when LLM omits required Pydantic fields."""
    mock_db = MagicMock()
    mock_model = _make_mock_model()
    # Missing many required fields — will fail Pydantic validation
    partial_response = json.dumps({"executive_summary": "Partial response only"})

    with patch("proxima.services.execution.engine.model_registry") as mock_registry:
        mock_registry.get_routing_candidates_for_task = AsyncMock(return_value=[mock_model])
        mock_registry.complete = AsyncMock(return_value=partial_response)

        result = await GeneralDocumentAnalyzer.analyze(mock_db, SAMPLE_TEXT, SAMPLE_METADATA)

    assert result["confidence"] == 0
    assert "Fallback Mode" in result["signals"]
