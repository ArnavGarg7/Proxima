"""WS-2: durable large-document analysis + map-reduce (Stage 7D)."""
import uuid

import pytest

from proxima.models.core import User, Document, DocumentChunk, BackgroundJob
from proxima.schemas.general_analysis import GeneralAnalysisResult, GeneralAnalysisPartial
from proxima.services.analysis import general_analysis_job as gaj
from proxima.services.analysis.general_analysis_job import (
    run_general_analysis_sync,
    SINGLE_PASS_CHARS,
    BATCH_CHARS,
)
from proxima.tasks import run_document_analysis


def _fake_exec(calls):
    def fake(db, *, task_class, system_prompt, user_message, schema, user_id=None, document_id=None, **kw):
        calls.append({"task_class": task_class, "len": len(user_message), "schema": schema.__name__})
        name = schema.__name__
        if name == "GeneralAnalysisResult":
            return schema(
                executive_summary="whole-doc summary",
                takeaways=[{"point": "p1", "evidence": []}],
                metadata={"reading_time_minutes": 1, "word_count": 1, "language": "en"},
                confidence=82,
            ), "model-x", 5
        if name == "GeneralAnalysisPartial":
            return schema(
                executive_summary="section summary",
                takeaways=[{"point": f"p{len(calls)}", "evidence": []}],
                confidence=70,
            ), "model-x", 5
        if name == "_SummaryOnly":
            return schema(executive_summary="final synthesized summary"), "model-x", 5
        return schema(), "model-x", 5
    return fake


# ── Map-reduce module ───────────────────────────────────────────────────────

def test_small_document_single_pass(monkeypatch):
    calls = []
    monkeypatch.setattr(gaj, "execute_structured_sync", _fake_exec(calls))
    result = run_general_analysis_sync(None, ["a short document."], {"title": "t"})
    assert len([c for c in calls if c["schema"] == "GeneralAnalysisResult"]) == 1
    assert len([c for c in calls if c["schema"] == "GeneralAnalysisPartial"]) == 0
    # Output preserves the GeneralAnalysisResult contract.
    assert set(GeneralAnalysisResult.model_fields).issubset(result.keys())
    assert result["metadata"]["word_count"] >= 1


def test_large_document_map_reduce(monkeypatch):
    calls = []
    monkeypatch.setattr(gaj, "execute_structured_sync", _fake_exec(calls))
    # Realistic chunking: ~100 chunks of ~900 chars (~90k chars total) → many
    # bounded map batches + one reduce. No prompt gets the whole document.
    chunks = ["word " * 180 for _ in range(100)]
    result = run_general_analysis_sync(None, chunks, {"title": "big"})

    map_calls = [c for c in calls if c["task_class"] == "general_analysis_map"]
    reduce_calls = [c for c in calls if c["task_class"] == "general_analysis_reduce"]
    assert len(map_calls) >= 2                       # genuinely chunk-batched
    assert len(reduce_calls) == 1
    # No single LLM prompt received the whole document.
    assert all(c["len"] <= BATCH_CHARS + 1000 for c in map_calls)
    assert all(c["len"] <= 13000 for c in reduce_calls)
    # Reduced output preserves the schema and marks map-reduce mode.
    assert set(GeneralAnalysisResult.model_fields).issubset(result.keys())
    assert "Map-Reduce Mode" in result["signals"]
    assert result["executive_summary"] == "final synthesized summary"


# ── Durable Celery task lifecycle ───────────────────────────────────────────

def _seed(sync_db, owner_email="ana@example.com", chunks=2, job_owner_same=True, job_status="pending"):
    user = User(email=f"{uuid.uuid4().hex[:6]}_{owner_email}", name="A")
    sync_db.add(user); sync_db.commit(); sync_db.refresh(user)
    doc = Document(user_id=user.user_id, title="a.txt", status="processed")
    sync_db.add(doc); sync_db.commit(); sync_db.refresh(doc)
    for i in range(chunks):
        sync_db.add(DocumentChunk(document_id=doc.document_id, chunk_index=i, content=f"chunk {i}", chunk_type="text"))
    sync_db.commit()
    if job_owner_same:
        job_user = user
    else:
        job_user = User(email=f"other_{uuid.uuid4().hex[:6]}@e.com", name="O")
        sync_db.add(job_user); sync_db.commit(); sync_db.refresh(job_user)
    job = BackgroundJob(job_id=uuid.uuid4(), user_id=job_user.user_id, job_type="analysis", status=job_status)
    sync_db.add(job); sync_db.commit(); sync_db.refresh(job)
    return user, doc, job


def _run(job, doc):
    return run_document_analysis.apply(args=[str(job.job_id), str(doc.document_id)]).result


def test_analysis_task_success(sync_db, monkeypatch):
    called = {"n": 0}

    def fake_analyze(db, chunk_texts, metadata):
        called["n"] += 1
        return {"executive_summary": "ok", "confidence": 77, "signals": []}

    monkeypatch.setattr(gaj, "run_general_analysis_sync", fake_analyze)

    user, doc, job = _seed(sync_db)
    result = _run(job, doc)
    assert result["status"] == "completed"
    assert called["n"] == 1

    sync_db.expire_all()
    saved = sync_db.get(BackgroundJob, job.job_id)
    assert saved.status == "completed"
    assert saved.started_at is not None
    assert saved.result["analyzer"] == "general"
    assert saved.result["analysis"]["confidence"] == 77


def test_analysis_task_ownership_mismatch(sync_db, monkeypatch):
    called = {"n": 0}
    monkeypatch.setattr(gaj, "run_general_analysis_sync",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))
    user, doc, job = _seed(sync_db, job_owner_same=False)
    result = _run(job, doc)
    assert result["status"] == "forbidden"
    assert called["n"] == 0
    sync_db.expire_all()
    assert sync_db.get(BackgroundJob, job.job_id).status == "failed"


def test_analysis_task_idempotent(sync_db, monkeypatch):
    called = {"n": 0}
    monkeypatch.setattr(gaj, "run_general_analysis_sync",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))
    user, doc, job = _seed(sync_db, job_status="completed")
    result = _run(job, doc)
    assert result["status"] == "already_completed"
    assert called["n"] == 0


def test_analysis_task_no_content(sync_db, monkeypatch):
    monkeypatch.setattr(gaj, "run_general_analysis_sync", lambda *a, **k: {})
    user, doc, job = _seed(sync_db, chunks=0)
    result = _run(job, doc)
    assert result["status"] == "failed"
    assert result["reason"] == "no_content"
