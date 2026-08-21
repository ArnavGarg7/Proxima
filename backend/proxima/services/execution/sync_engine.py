"""
Synchronous structured execution for Celery workers (Stage 7D).

Analyzers and the async ProximaAIEngine are async and tied to the async DB
session. Durable analysis runs in a synchronous Celery worker, so this module
provides a minimal sync counterpart that REUSES the provider logic
(model_registry.complete) via a bridged event loop — never duplicating provider
code and never bridging asyncpg (DB reads/writes use the sync session).
"""

import asyncio
import json
import time
from typing import Optional, Type

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session
import structlog

from proxima.services.model_registry import model_registry
from proxima.services.execution.engine import ProximaAIEngine
from proxima.services.execution.auditor import AIAuditor

logger = structlog.get_logger()

_TRANSIENT_STATUSES = {429, 500, 502, 503, 504}


class AnalysisExecutionError(Exception):
    """Base class for sync analysis execution errors."""


class TransientAnalysisError(AnalysisExecutionError):
    """Retryable failure (provider timeout / rate limit / 5xx)."""


class TerminalAnalysisError(AnalysisExecutionError):
    """Non-retryable failure (no model, auth, bad schema)."""


_worker_loop: Optional[asyncio.AbstractEventLoop] = None


def _run_coro(coro):
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
    return _worker_loop.run_until_complete(coro)


def get_default_generation_sync(db: Session):
    """Fetch the default active generation model using a synchronous session."""
    from proxima.models import RegisteredModel

    stmt = select(RegisteredModel).where(
        RegisteredModel.model_type == "generation",
        RegisteredModel.is_default_generation == True,  # noqa: E712
        RegisteredModel.is_active == True,  # noqa: E712
    )
    return db.execute(stmt).scalar_one_or_none()


def execute_structured_sync(
    db: Session,
    *,
    task_class: str,
    system_prompt: str,
    user_message: str,
    schema: Type[BaseModel],
    user_id=None,
    document_id=None,
    temperature: float = 0.1,
    max_tokens: int = 4096,
):
    """
    Run one structured (JSON) completion synchronously and return the validated
    pydantic model. Raises TransientAnalysisError on retryable provider failures
    (so the Celery task can retry) and TerminalAnalysisError otherwise. Audits an
    estimated-usage AIRequest via AIAuditor.log_request_sync.
    """
    model = get_default_generation_sync(db)
    if not model:
        raise TerminalAnalysisError("No active default generation model")

    start = time.monotonic()
    try:
        raw = _run_coro(
            model_registry.complete(
                model=model,
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format="json",
                structured_output_schema=schema,
            )
        )
    except HTTPException as e:
        if e.status_code in _TRANSIENT_STATUSES:
            raise TransientAnalysisError(f"provider {e.status_code}") from e
        raise TerminalAnalysisError(f"provider {e.status_code}") from e
    except Exception as e:  # unknown provider/client error → treat as transient once
        raise TransientAnalysisError(str(e)) from e

    latency_ms = int((time.monotonic() - start) * 1000)

    cleaned = ProximaAIEngine._clean_json_response(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise TerminalAnalysisError(f"invalid_json: {e}") from e
    try:
        validated = schema(**data)
    except ValidationError as e:
        raise TerminalAnalysisError(f"schema_validation: {e}") from e

    # Audit estimated usage (never stores prompt/response content).
    AIAuditor.log_request_sync(
        db=db,
        user_id=user_id,
        document_id=document_id,
        model=model,
        task_class=task_class,
        prompt_content=(system_prompt or "") + "\n" + (user_message or ""),
        response_content=raw or "",
    )

    return validated, model.model_id, latency_ms
