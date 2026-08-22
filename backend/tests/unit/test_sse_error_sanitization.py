"""Stage 8: client-facing intelligence errors must not leak provider internals.

`_safe_stream_error` produces the exact `detail` string placed into the SSE
`error` event. A raw provider exception mentioning a model id / API version must
never reach the browser.
"""
import json

import pytest
from fastapi import HTTPException

from proxima.routers.intelligence_router import _safe_stream_error

# A realistic raw provider error (this exact string leaked before Stage 8).
LEAK = "500: Provider Error: 404 models/text-embedding-004 is not found for API version v1beta"
LEAK_TOKENS = ["text-embedding-004", "v1beta", "Provider Error", "models/"]

SAFE_MESSAGES = {
    "The AI provider rejected the request. Please contact support if this persists.",
    "The service is busy right now. Please try again in a moment.",
    "The AI provider is temporarily unavailable. Please try again shortly.",
    "The request to the AI provider timed out. Please try again.",
    "Something went wrong while generating the answer.",
}


def _sse_frame(detail: str) -> str:
    # Mirror exactly how the router builds the SSE event.
    return f"data: {json.dumps({'type': 'error', 'detail': detail})}\n\n"


def test_httpexception_with_provider_detail_is_sanitized():
    detail = _safe_stream_error(HTTPException(status_code=500, detail=LEAK))
    assert detail in SAFE_MESSAGES
    frame = _sse_frame(detail)
    for token in LEAK_TOKENS:
        assert token not in frame


def test_generic_exception_is_sanitized():
    detail = _safe_stream_error(RuntimeError(LEAK))
    assert detail in SAFE_MESSAGES
    assert "text-embedding-004" not in _sse_frame(detail)


@pytest.mark.parametrize("status,needle", [
    (401, "rejected"),
    (429, "busy"),
    (503, "temporarily unavailable"),
    (504, "timed out"),
])
def test_status_maps_to_useful_but_safe_message(status, needle):
    detail = _safe_stream_error(HTTPException(status_code=status, detail=LEAK))
    assert needle in detail
    assert "text-embedding-004" not in detail


def test_sse_event_structure_preserved():
    frame = _sse_frame(_safe_stream_error(HTTPException(status_code=502, detail=LEAK)))
    assert frame.startswith("data: ")
    assert frame.endswith("\n\n")
    payload = json.loads(frame[len("data: "):].strip())
    assert payload["type"] == "error"
    assert isinstance(payload["detail"], str)
