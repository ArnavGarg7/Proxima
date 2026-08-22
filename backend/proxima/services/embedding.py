"""
Embedding Service.

Generates vector embeddings for text using the default registered embedding
model. Two boundaries share the SAME provider logic (model_registry):

  * async  — generate_chunk_embedding()      (FastAPI: backfill, hybrid retrieval)
  * sync   — generate_chunk_embedding_sync()  (Celery workers, Stage 7C)

The sync path does its DB read with a synchronous session, then bridges the
async provider call through a per-process event loop. Provider logic is never
duplicated.
"""

import threading
import time

import structlog
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from proxima.config import settings
from proxima.services.model_registry import model_registry

logger = structlog.get_logger()


class SyncRateLimiter:
    """Thread-safe minimum-interval throttle for the synchronous ingestion path.

    Only sleeps when calls arrive faster than the configured requests/minute, so
    small documents (a handful of chunks) are never slowed. Bounds embedding
    throughput below the provider's per-minute quota so a large document does not
    exhaust its retry budget on 429s. Provider-agnostic — it is just an RPM cap.
    """

    def __init__(self, rpm: int):
        self._min_interval = 60.0 / rpm if rpm and rpm > 0 else 0.0
        self._lock = threading.Lock()
        self._next = 0.0

    def acquire(self) -> None:
        if self._min_interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            wait = self._next - now
            if wait > 0:
                time.sleep(wait)
                now = time.monotonic()
            self._next = now + self._min_interval


# Process-wide limiter for the ingestion embedding path (0 rpm = unlimited).
_embedding_limiter = SyncRateLimiter(settings.embedding_rpm)


class EmbeddingError(Exception):
    """Base class for embedding failures."""


class TransientEmbeddingError(EmbeddingError):
    """Retryable embedding failure (timeout, rate limit, provider 5xx)."""


class TerminalEmbeddingError(EmbeddingError):
    """Non-retryable embedding failure (auth, bad request, no model)."""


# HTTP statuses the providers raise that should be retried.
_TRANSIENT_STATUSES = {429, 500, 502, 503, 504}


def _is_transient_status(status_code: int) -> bool:
    return status_code in _TRANSIENT_STATUSES


async def generate_chunk_embedding(db: AsyncSession, text: str) -> Optional[List[float]]:
    """
    Async embedding generation (FastAPI paths). Returns None on failure so that
    FTS-only retrieval remains intact.
    """
    if not text or not text.strip():
        return None

    try:
        emb_model = await model_registry.get_default_embedding(db)
        if not emb_model:
            logger.warning("embedding.generate.no_model_found")
            return None
        vector = await model_registry.get_embedding(emb_model, text)
        return vector
    except Exception as e:
        logger.error("embedding.generate.failed", error=str(e), text_preview=text[:100])
        return None


# ── Synchronous worker boundary ─────────────────────────────────────────────

# Bridge the async provider call through the ONE shared worker loop (see
# proxima.services.sync_bridge) so the embedding and generation paths do not
# create grpc.aio channels on different event loops.
from proxima.services.sync_bridge import run_coro as _run_coro


def get_default_embedding_sync(db: Session):
    """Fetch the default active embedding model using a synchronous session.

    Returns None when none is configured (ingestion then degrades to FTS-only).
    """
    from proxima.models import RegisteredModel

    stmt = select(RegisteredModel).where(
        RegisteredModel.model_type == "embedding",
        RegisteredModel.is_default_embedding == True,  # noqa: E712
        RegisteredModel.is_active == True,  # noqa: E712
    )
    return db.execute(stmt).scalar_one_or_none()


def generate_chunk_embedding_sync(db: Session, text: str, emb_model=None) -> Optional[List[float]]:
    """
    Synchronous embedding generation for Celery workers.

    Reuses model_registry.get_embedding (provider logic) via a bridged event
    loop. Raises TransientEmbeddingError for retryable provider failures so the
    task can retry; returns None for terminal failures so the chunk is persisted
    without an embedding (FTS-only retrieval stays intact and a later backfill
    can complete it).
    """
    if not text or not text.strip():
        return None

    try:
        if emb_model is None:
            emb_model = get_default_embedding_sync(db)
        if not emb_model:
            return None
        # Backpressure: stay under the provider's per-minute embedding quota.
        _embedding_limiter.acquire()
        return _run_coro(model_registry.get_embedding(emb_model, text))
    except TransientEmbeddingError:
        raise
    except HTTPException as e:
        if _is_transient_status(e.status_code):
            raise TransientEmbeddingError(f"provider {e.status_code}") from e
        logger.error("embedding.sync.terminal", status=e.status_code)
        return None
    except Exception as e:  # unknown → treat as terminal to avoid retry storms
        logger.error("embedding.sync.failed", error=str(e), text_preview=text[:100])
        return None
