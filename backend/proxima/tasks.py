"""
Celery tasks.

Stage 7C: durable document ingestion. The task owns the BackgroundJob lifecycle
(pending → running → completed/failed), validates ownership, and is safe under
Celery redelivery (idempotent). It runs synchronously against a psycopg2-backed
session (proxima.worker_db) — never bridging asyncpg.
"""

import time
from datetime import datetime, timezone

import structlog
from sqlalchemy.exc import OperationalError

from proxima.celery_app import celery_app

logger = structlog.get_logger()


def _utcnow():
    return datetime.now(timezone.utc)


def _fail_job(db, job, reason: str) -> None:
    job.status = "failed"
    job.error_message = reason[:2000] if reason else None
    job.completed_at = _utcnow()
    db.commit()


@celery_app.task(
    bind=True,
    name="proxima.tasks.ingest_document",
    acks_late=True,
    max_retries=3,
    default_retry_delay=10,
)
def ingest_document(self, job_id: str, document_id: str, file_uri: str) -> dict:
    """
    Durable document ingestion.

    Args carry only identifiers + a storage URI (never document contents). The
    worker loads the BackgroundJob and Document, validates that they belong to
    the same user, then parses / chunks / embeds / persists. Redelivery of an
    already-completed job is a no-op; a partially-run job is safely re-run
    (chunk persistence is idempotent).
    """
    from proxima.models.core import BackgroundJob, Document
    from proxima.services.document_ingestion import (
        DocumentNotFoundError,
        DocumentParseError,
        ingest_document_sync,
    )
    from proxima.services.embedding import TransientEmbeddingError
    from proxima.worker_db import get_sync_session

    start = time.monotonic()

    with get_sync_session() as db:
        job = db.get(BackgroundJob, job_id)
        if job is None:
            logger.error("ingest.job_missing", job_id=str(job_id))
            return {"status": "job_missing", "job_id": str(job_id)}

        # Idempotency: never reprocess a finished job on redelivery.
        if job.status == "completed":
            logger.info("ingest.already_completed", job_id=str(job_id))
            return {"status": "already_completed", "job_id": str(job_id)}

        document = db.get(Document, document_id)
        if document is None:
            _fail_job(db, job, "document_not_found")
            logger.error("ingest.document_missing", job_id=str(job_id), document_id=str(document_id))
            return {"status": "document_not_found", "job_id": str(job_id)}

        # Security: the task must never trust an arbitrary document id — the job
        # and the document have to belong to the same user.
        if str(document.user_id) != str(job.user_id):
            _fail_job(db, job, "ownership_mismatch")
            logger.error("ingest.ownership_mismatch", job_id=str(job_id), document_id=str(document_id))
            return {"status": "forbidden", "job_id": str(job_id)}

        # Transition to running (idempotent — safe on a re-run).
        job.status = "running"
        if job.started_at is None:
            job.started_at = _utcnow()
        db.commit()

        # On the final permitted attempt, degrade gracefully (persist without
        # embeddings) rather than failing the whole document.
        allow_degraded = self.request.retries >= self.max_retries

        try:
            outcome = ingest_document_sync(
                db, document.document_id, file_uri, allow_degraded=allow_degraded
            )
        except TransientEmbeddingError as exc:
            logger.warning(
                "ingest.transient_retry",
                job_id=str(job_id),
                retries=self.request.retries,
                task_type="document_ingestion",
            )
            # Nothing was persisted — retry cleanly.
            raise self.retry(exc=exc)
        except OperationalError as exc:  # transient DB failure
            logger.warning("ingest.db_retry", job_id=str(job_id), retries=self.request.retries)
            raise self.retry(exc=exc)
        except (DocumentNotFoundError, DocumentParseError) as exc:
            _fail_job(db, job, f"{type(exc).__name__}:{exc}")
            logger.error(
                "ingest.terminal_failure",
                job_id=str(job_id),
                reason=type(exc).__name__,
                task_type="document_ingestion",
            )
            return {"status": "failed", "job_id": str(job_id), "reason": type(exc).__name__}
        except Exception as exc:  # unexpected — record and surface for visibility
            _fail_job(db, job, f"internal_error:{type(exc).__name__}")
            logger.error("ingest.unexpected", job_id=str(job_id), error=str(exc))
            raise

        duration_ms = int((time.monotonic() - start) * 1000)
        job.status = "completed"
        job.completed_at = _utcnow()
        job.result = {
            **outcome.as_dict(),
            "duration_ms": duration_ms,
            "retry_count": self.request.retries,
        }
        db.commit()

        logger.info(
            "ingest.completed",
            job_id=str(job_id),
            task_type="document_ingestion",
            status=outcome.status,
            duration_ms=duration_ms,
            retry_count=self.request.retries,
            chunks_processed=outcome.chunks_total,
            embed_success=outcome.embed_success,
            embed_failure=outcome.embed_failure,
        )
        return {"status": outcome.status, "job_id": str(job_id), **outcome.as_dict()}
