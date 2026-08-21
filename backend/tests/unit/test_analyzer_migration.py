"""Stage 7E — analyzers route through ProximaAIEngine; success + fallback shapes."""
import uuid

import pytest

from proxima.services.execution.engine import ProximaAIEngine


class _FakeVD:
    def __init__(self, d): self._d = d
    def model_dump(self): return dict(self._d)


class _FakeResult:
    def __init__(self, data=None, error=None):
        self.error = error
        self.validated_data = _FakeVD(data) if data is not None else None
        self.provider = "openai"
        self.model_id = "llama-3.3-70b-versatile"
        self.latency_ms = 5


def _patch_engine(monkeypatch, *, data=None, error=None, spy=None):
    async def fake(db, request, stream=False):
        if spy is not None:
            spy.append(request)
        return _FakeResult(data=data, error=error)
    monkeypatch.setattr(ProximaAIEngine, "execute", fake)


# ── Contract ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_contract_success_and_engine_contract(monkeypatch):
    from proxima.services.contract_analyzer import ContractAnalyzer
    spy = []
    _patch_engine(monkeypatch, data={"executive_summary": "AI legal ok"}, spy=spy)
    meta = {"document_id": str(uuid.uuid4()), "filename": "c.pdf", "user_id": str(uuid.uuid4())}
    result = await ContractAnalyzer.analyze(None, "This Agreement shall govern liability.", meta)
    assert result["executive_summary"] == "AI legal ok"
    assert "document_id" in result and "document_title" in result
    assert spy[0].task_class == "legal_analysis"
    assert spy[0].structured_output_schema is not None


@pytest.mark.asyncio
async def test_contract_failure_uses_fallback(monkeypatch):
    from proxima.services.contract_analyzer import ContractAnalyzer
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    meta = {"document_id": str(uuid.uuid4()), "filename": "c.pdf", "user_id": str(uuid.uuid4())}
    result = await ContractAnalyzer.analyze(None, "This Agreement shall govern liability.", meta)
    assert "document_domain_hint" in result
    assert "unavailable" in result["executive_summary"].lower() or "failed" in result["classification_summary"].lower()


# ── Clinical ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_clinical_success(monkeypatch):
    from proxima.services.clinical_analyzer import ClinicalAnalyzer
    spy = []
    _patch_engine(monkeypatch, data={"summary": "clinical ok"}, spy=spy)
    meta = {"id": str(uuid.uuid4()), "title": "Note", "user_id": str(uuid.uuid4())}
    result = await ClinicalAnalyzer.analyze(None, "Chief complaint: cough. Assessment: bronchitis. Plan: rest.", meta)
    assert result["summary"] == "clinical ok"
    assert result["document_id"] and result["document_title"] == "Note"
    assert spy[0].task_class == "clinical_analysis"


@pytest.mark.asyncio
async def test_clinical_fallback_does_not_fabricate(monkeypatch):
    from proxima.services.clinical_analyzer import ClinicalAnalyzer
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    meta = {"id": str(uuid.uuid4()), "title": "Note", "user_id": str(uuid.uuid4())}
    result = await ClinicalAnalyzer.analyze(None, "Chief complaint: cough. Assessment: bronchitis. Plan: rest.", meta)
    # Deterministic fallback — no fabricated clinical conclusions.
    assert "unavailable" in result["summary"].lower()
    assert result["confidence"]["overall"] == 0
    assert result["clinical_summary"]["diagnoses_or_assessment"] == []
    assert result["clinical_summary"]["plan_items"] == []
    assert result["clinical_snapshot"]["top_assessment"] == "Not generated"
    assert result["document_id"]  # metadata preserved


# ── Compare ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_compare_success_threads_db_user(monkeypatch):
    from proxima.services.compare_analyzer import CompareAnalyzer
    spy = []
    _patch_engine(monkeypatch, data={"executive_summary": "cmp ok", "change_snapshot": {}}, spy=spy)
    uid, did = uuid.uuid4(), uuid.uuid4()
    result = await CompareAnalyzer.analyze("alpha one two", "alpha one three",
                                           db=None, user_id=uid, document_id=did)
    assert result["executive_summary"] == "cmp ok"
    assert "document_profile" in result and "similarity_score" in result
    assert spy[0].task_class == "compare_analysis"
    assert spy[0].user_id == uid and spy[0].document_id == did


@pytest.mark.asyncio
async def test_compare_failure_uses_fallback(monkeypatch):
    from proxima.services.compare_analyzer import CompareAnalyzer
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    result = await CompareAnalyzer.analyze("alpha", "beta", db=None, user_id=uuid.uuid4())
    assert result["overall_change_level"] == "Unknown"
    assert "document_profile" in result


# ── Code Suite (explain/docs) ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_code_suite_explain_preserves_shape(monkeypatch):
    from proxima.services.code_suite_service import CodeSuiteService
    canned = {
        "operation": "explain", "language_detected": "python",
        "summary": "s", "result_markdown": "# explanation",
        "snippet_profile": {"line_count": 2, "function_count": 1, "class_count": 0, "import_count": 0, "comment_lines": 0},
        "review_actions": [], "diagnostics": {},
    }
    _patch_engine(monkeypatch, data=canned)
    result = await CodeSuiteService.analyze(db=None, snippet="def f():\n    return 1", operation="explain", language="python", user_id=uuid.uuid4())
    assert set(["operation", "language_detected", "summary", "result_markdown",
                "snippet_profile", "review_actions", "diagnostics"]).issubset(result.keys())
    assert result["diagnostics"]["review_signals_detected"] >= 0


@pytest.mark.asyncio
async def test_code_suite_failure_uses_fallback(monkeypatch):
    from proxima.services.code_suite_service import CodeSuiteService
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    result = await CodeSuiteService.analyze(db=None, snippet="def f():\n    return 1", operation="explain", language="python", user_id=uuid.uuid4())
    assert result["diagnostics"]["fallback_reason"] == "error"
    assert "snippet_profile" in result


# ── Code Analysis synthesizer (review/optimize/security) ─────────────────────

@pytest.mark.asyncio
async def test_code_analysis_review_success(monkeypatch):
    from proxima.services.code_analysis.analyzer import CodeAnalyzer
    canned = {
        "executive_summary": "e", "overall_score": 88, "security_score": 90,
        "maintainability_score": 80, "documentation_score": 70, "performance_score": 75,
        "review_priorities": [], "security_findings": [], "maintainability_findings": [],
        "performance_findings": [], "documentation_findings": [],
    }
    _patch_engine(monkeypatch, data=canned)
    result = await CodeAnalyzer.analyze("def f():\n    return 1", operation="review", db=None, user_id=uuid.uuid4())
    assert result["overall_score"] == 88
    assert result["radar_scores"]["security"] == 90


@pytest.mark.asyncio
async def test_code_analysis_failure_uses_fallback(monkeypatch):
    from proxima.services.code_analysis.analyzer import CodeAnalyzer
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    result = await CodeAnalyzer.analyze("def f():\n    return 1", operation="review", db=None, user_id=uuid.uuid4())
    assert result["overall_score"] == 0
    assert "metrics" in result


# ── Domain Radar (Stage 7F P0) ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_domain_radar_success(monkeypatch):
    from proxima.services.domain_radar import DomainRadar
    spy = []
    canned = {
        "primary_domain": {"domain": "legal", "score": 0.8, "confidence_label": "high"},
        "summary": "A legal agreement.",
        "recommended_surfaces": [{"surface": "audit", "reason": "risk review"}],
    }
    _patch_engine(monkeypatch, data=canned, spy=spy)
    meta = {"id": str(uuid.uuid4()), "title": "Contract", "user_id": str(uuid.uuid4())}
    result = await DomainRadar.analyze(None, "This Agreement shall govern liability and indemnify.", meta)
    assert result["primary_domain"]["domain"] == "legal"
    assert result["recommended_surfaces"][0]["surface"] == "audit"
    assert "candidate_domains" in result and result["diagnostics"]["llm_resolution_used"] is True
    assert spy[0].task_class == "domain_analysis"
    assert spy[0].structured_output_schema is not None


@pytest.mark.asyncio
async def test_domain_radar_failure_uses_fallback(monkeypatch):
    from proxima.services.domain_radar import DomainRadar
    _patch_engine(monkeypatch, error=RuntimeError("boom"))
    meta = {"id": str(uuid.uuid4()), "title": "Doc", "user_id": str(uuid.uuid4())}
    result = await DomainRadar.analyze(None, "This Agreement shall govern liability.", meta)
    assert result["diagnostics"]["llm_resolution_used"] is False
    assert "primary_domain" in result and "candidate_domains" in result
