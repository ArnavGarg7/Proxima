"""
Document Ingestion Service.

Coordinates the ingestion pipeline: parse → chunk → embed → persist.

Since Stage 7C ingestion runs durably inside Celery workers, this module is
synchronous. Parsing and chunking are session-agnostic and live here once;
embedding reuses the shared embedding boundary (proxima.services.embedding);
persistence uses a synchronous SQLAlchemy session. There is no second async
implementation to drift from — the previous FastAPI BackgroundTasks path has
been retired in favour of durable Celery jobs.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

import structlog
from sqlalchemy import delete
from sqlalchemy.orm import Session

from proxima.models.core import Document, DocumentChunk
from proxima.services.chunking import ChunkingService
from proxima.services.embedding import (
    TransientEmbeddingError,
    generate_chunk_embedding_sync,
    get_default_embedding_sync,
)
from proxima.services.parsers import ParserFactory, UnsupportedFormatError

logger = structlog.get_logger()


class DocumentNotFoundError(Exception):
    """The document row does not exist (terminal)."""


class DocumentParseError(Exception):
    """The document could not be parsed (terminal)."""


@dataclass
class IngestionOutcome:
    status: str                       # processed | no_extractable_text
    chunks_total: int = 0
    embed_success: int = 0
    embed_failure: int = 0
    degraded: bool = False
    warnings: list = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "status": self.status,
            "chunks_total": self.chunks_total,
            "embed_success": self.embed_success,
            "embed_failure": self.embed_failure,
            "degraded": self.degraded,
        }


# ── Shared, session-agnostic stages ─────────────────────────────────────────

def parse_document_text(file_path_or_uri: str) -> str:
    """Extract text from a stored file. Raises DocumentParseError on failure."""
    ext = os.path.splitext(file_path_or_uri)[1].lower()
    try:
        parser = ParserFactory.get_parser(ext)
    except UnsupportedFormatError as e:
        raise DocumentParseError(f"unsupported_format:{ext}") from e
    try:
        return parser.extract_text(file_path_or_uri)
    except Exception as e:  # corrupt / unreadable file
        raise DocumentParseError(f"extract_failed:{type(e).__name__}") from e


def build_chunk_records(text: str, chunking_service: ChunkingService | None = None) -> list[dict]:
    """Split text into chunk records (session-agnostic)."""
    chunking_service = chunking_service or ChunkingService()
    return chunking_service.chunk_text_with_metadata(text)


# ── Synchronous pipeline (Celery worker path) ───────────────────────────────

def ingest_document_sync(
    db: Session,
    document_id,
    file_path_or_uri: str,
    *,
    allow_degraded: bool = False,
    chunking_service: ChunkingService | None = None,
) -> IngestionOutcome:
    """
    Ingest a document synchronously.

    Parsing and chunking happen with no writes; embeddings are computed before
    any persistence so a transient embedding failure can bubble up (as
    TransientEmbeddingError) with NOTHING committed — making a Celery retry clean
    and idempotent. On the final attempt, pass allow_degraded=True to persist
    chunks without embeddings (FTS-only) instead of failing the whole job.

    Persistence is idempotent: existing chunks for the document are cleared and
    rewritten in a single transaction, so task redelivery cannot duplicate or
    corrupt chunk state.
    """
    document = db.get(Document, document_id)
    if document is None:
        raise DocumentNotFoundError(str(document_id))

    document.status = "processing"
    db.commit()

    # Parse (terminal on failure — mark the document failed and re-raise)
    try:
        text = parse_document_text(file_path_or_uri)
    except DocumentParseError:
        document.status = "failed"
        db.commit()
        raise

    if not text or not text.strip():
        document.status = "no_extractable_text"
        db.commit()
        return IngestionOutcome(status="no_extractable_text")

    records = build_chunk_records(text, chunking_service)
    emb_model = get_default_embedding_sync(db)

    # Compute embeddings first — no DB writes yet.
    prepared: list[tuple[int, dict, list | None]] = []
    embed_success = 0
    embed_failure = 0
    degraded = False
    for idx, rec in enumerate(records):
        vector = None
        try:
            vector = generate_chunk_embedding_sync(db, rec["content"], emb_model=emb_model)
        except TransientEmbeddingError:
            if not allow_degraded:
                raise  # nothing persisted yet → caller (task) retries cleanly
            degraded = True
        if vector:
            embed_success += 1
        else:
            embed_failure += 1
        prepared.append((idx, rec, vector))

    # Persist idempotently: clear any prior chunks, then rewrite — single commit.
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.document_id))

    embedded_at = datetime.now(timezone.utc)
    for idx, rec, vector in prepared:
        chunk = DocumentChunk(
            document_id=document.document_id,
            chunk_index=idx,
            content=rec["content"],
            chunk_type="text",
            metadata_fields={"page_number": rec.get("page_number")},
        )
        if vector:
            chunk.embedding = vector
            if emb_model:
                chunk.embedding_model = emb_model.model_id
                chunk.embedding_version = emb_model.embedding_version
                chunk.embedding_dimensions = emb_model.embedding_dimensions
                chunk.embedded_at = embedded_at
        db.add(chunk)

    document.status = "processed"
    db.commit()

    return IngestionOutcome(
        status="processed",
        chunks_total=len(prepared),
        embed_success=embed_success,
        embed_failure=embed_failure,
        degraded=degraded,
    )
