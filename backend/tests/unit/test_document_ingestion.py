"""Sync document ingestion pipeline (Stage 7C)."""
import os
import uuid

import pytest
from sqlalchemy import select

from proxima.models.core import User, Document, DocumentChunk
from proxima.services import document_ingestion as di
from proxima.services.document_ingestion import (
    DocumentNotFoundError,
    DocumentParseError,
    ingest_document_sync,
    parse_document_text,
    build_chunk_records,
)


def _get_user(sync_db) -> User:
    user = sync_db.execute(select(User).limit(1)).scalars().first()
    if not user:
        user = User(email="ingest_sync@example.com", name="Ingest Sync")
        sync_db.add(user)
        sync_db.commit()
        sync_db.refresh(user)
    return user


# ── Shared, session-agnostic stages ─────────────────────────────────────────

def test_build_chunk_records_pure():
    records = build_chunk_records("Hello world. " * 20)
    assert len(records) >= 1
    assert all("content" in r and "page_number" in r for r in records)


def test_parse_unsupported_format_raises():
    with pytest.raises(DocumentParseError):
        parse_document_text("something.exe")


# ── Sync pipeline ───────────────────────────────────────────────────────────

def test_ingestion_text_extraction(sync_db, monkeypatch):
    # Avoid any provider call — persist chunks without embeddings (FTS-only).
    monkeypatch.setattr(di, "generate_chunk_embedding_sync", lambda *a, **k: None)
    monkeypatch.setattr(di, "get_default_embedding_sync", lambda *a, **k: None)

    user = _get_user(sync_db)
    doc = Document(user_id=user.user_id, title="test.txt", status="uploaded")
    sync_db.add(doc)
    sync_db.commit()
    sync_db.refresh(doc)

    path = f"./test_{doc.document_id}.txt"
    with open(path, "w") as f:
        f.write("Hello world! This is a test document for sync ingestion.")

    try:
        outcome = ingest_document_sync(sync_db, doc.document_id, path)
        assert outcome.status == "processed"
        assert outcome.chunks_total >= 1

        sync_db.refresh(doc)
        assert doc.status == "processed"

        chunks = sync_db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.document_id)
        ).scalars().all()
        assert len(chunks) == outcome.chunks_total
    finally:
        os.remove(path)


def test_ingestion_idempotent_rerun(sync_db, monkeypatch):
    """Re-running ingestion must not duplicate chunks."""
    monkeypatch.setattr(di, "generate_chunk_embedding_sync", lambda *a, **k: None)
    monkeypatch.setattr(di, "get_default_embedding_sync", lambda *a, **k: None)

    user = _get_user(sync_db)
    doc = Document(user_id=user.user_id, title="idem.txt", status="uploaded")
    sync_db.add(doc)
    sync_db.commit()
    sync_db.refresh(doc)

    path = f"./test_idem_{doc.document_id}.txt"
    with open(path, "w") as f:
        f.write("Chunk one content. " * 30)

    try:
        first = ingest_document_sync(sync_db, doc.document_id, path)
        second = ingest_document_sync(sync_db, doc.document_id, path)
        assert first.chunks_total == second.chunks_total

        chunks = sync_db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.document_id)
        ).scalars().all()
        # Idempotent: still exactly one set of chunks after two runs.
        assert len(chunks) == second.chunks_total
    finally:
        os.remove(path)


def test_ingestion_unsupported_format(sync_db):
    user = _get_user(sync_db)
    doc = Document(user_id=user.user_id, title="test.exe", status="uploaded")
    sync_db.add(doc)
    sync_db.commit()
    sync_db.refresh(doc)

    with pytest.raises(DocumentParseError):
        ingest_document_sync(sync_db, doc.document_id, "fake.exe")

    sync_db.refresh(doc)
    assert doc.status == "failed"


def test_ingestion_missing_document(sync_db):
    with pytest.raises(DocumentNotFoundError):
        ingest_document_sync(sync_db, uuid.uuid4(), "fake.txt")
