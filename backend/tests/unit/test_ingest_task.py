"""Celery ingestion task lifecycle, ownership & idempotency (Stage 7C)."""
import uuid

import pytest

from proxima.models.core import User, Document, BackgroundJob
from proxima.services import document_ingestion as di
from proxima.services.document_ingestion import IngestionOutcome, DocumentParseError
from proxima.tasks import ingest_document


def _user(sync_db, email) -> User:
    u = User(email=email, name="T")
    sync_db.add(u)
    sync_db.commit()
    sync_db.refresh(u)
    return u


def _doc(sync_db, user) -> Document:
    d = Document(user_id=user.user_id, title="t.txt", status="uploaded")
    sync_db.add(d)
    sync_db.commit()
    sync_db.refresh(d)
    return d


def _job(sync_db, owner, status="pending") -> BackgroundJob:
    j = BackgroundJob(job_id=uuid.uuid4(), user_id=owner.user_id,
                      job_type="document_ingestion", status=status)
    sync_db.add(j)
    sync_db.commit()
    sync_db.refresh(j)
    return j


def _run(job, doc):
    return ingest_document.apply(args=[str(job.job_id), str(doc.document_id), "unused.txt"]).result


def test_task_success_transitions(sync_db, monkeypatch):
    calls = {"n": 0}

    def fake_ingest(db, document_id, file_uri, **kwargs):
        calls["n"] += 1
        return IngestionOutcome(status="processed", chunks_total=3, embed_success=3, embed_failure=0)

    monkeypatch.setattr(di, "ingest_document_sync", fake_ingest)

    user = _user(sync_db, f"succ_{uuid.uuid4()}@e.com")
    doc = _doc(sync_db, user)
    job = _job(sync_db, user)

    result = _run(job, doc)
    assert result["status"] == "processed"
    assert calls["n"] == 1

    sync_db.expire_all()
    saved = sync_db.get(BackgroundJob, job.job_id)
    assert saved.status == "completed"
    assert saved.started_at is not None
    assert saved.completed_at is not None
    assert saved.result["chunks_total"] == 3
    assert saved.result["retry_count"] == 0


def test_task_ownership_mismatch(sync_db, monkeypatch):
    called = {"n": 0}
    monkeypatch.setattr(di, "ingest_document_sync",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))

    owner = _user(sync_db, f"owner_{uuid.uuid4()}@e.com")
    attacker = _user(sync_db, f"att_{uuid.uuid4()}@e.com")
    doc = _doc(sync_db, owner)            # document belongs to owner
    job = _job(sync_db, attacker)         # job belongs to a different user

    result = _run(job, doc)
    assert result["status"] == "forbidden"
    assert called["n"] == 0               # processing never started

    sync_db.expire_all()
    saved = sync_db.get(BackgroundJob, job.job_id)
    assert saved.status == "failed"
    assert saved.error_message == "ownership_mismatch"


def test_task_idempotent_completed(sync_db, monkeypatch):
    called = {"n": 0}
    monkeypatch.setattr(di, "ingest_document_sync",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))

    user = _user(sync_db, f"idem_{uuid.uuid4()}@e.com")
    doc = _doc(sync_db, user)
    job = _job(sync_db, user, status="completed")

    result = _run(job, doc)
    assert result["status"] == "already_completed"
    assert called["n"] == 0               # never reprocessed


def test_task_terminal_parse_failure(sync_db, monkeypatch):
    def boom(*a, **k):
        raise DocumentParseError("unsupported_format:.exe")

    monkeypatch.setattr(di, "ingest_document_sync", boom)

    user = _user(sync_db, f"term_{uuid.uuid4()}@e.com")
    doc = _doc(sync_db, user)
    job = _job(sync_db, user)

    result = _run(job, doc)
    assert result["status"] == "failed"
    assert result["reason"] == "DocumentParseError"

    sync_db.expire_all()
    saved = sync_db.get(BackgroundJob, job.job_id)
    assert saved.status == "failed"
    assert "DocumentParseError" in (saved.error_message or "")
