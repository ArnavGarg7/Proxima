"""
Unit tests for GroundingService (Stage 7B).
"""
import pytest
from proxima.services.grounding import GroundingService

@pytest.fixture
def grounding_service():
    return GroundingService()

def test_build_context_package_empty(grounding_service):
    text, registry = grounding_service.build_context_package([])
    assert text == "No relevant context found."
    assert registry == {}

def test_build_context_package_formatting(grounding_service):
    chunks = [
        {"chunk_id": "c1", "document_id": "d1", "document_title": "Doc A.pdf", "page_number": 3, "content": "Evidence content A"},
        {"chunk_id": "c2", "document_id": "d1", "document_title": "Doc A.pdf", "page_number": 5, "content": "Evidence content B"}
    ]
    
    context, registry = grounding_service.build_context_package(chunks)
    
    assert "[Ref 1]" in context
    assert "Document: Doc A.pdf" in context
    assert "Page: 3" in context
    assert "Evidence content A" in context
    
    assert "[Ref 2]" in context
    assert "Page: 5" in context
    
    assert registry["[Ref 1]"] == chunks[0]
    assert registry["[Ref 2]"] == chunks[1]

def test_process_citations_valid_and_invalid(grounding_service):
    registry = {
        "[Ref 1]": {"chunk_id": "c1", "document_id": "d1", "document_title": "Doc A.pdf", "page_number": 1, "content": "Supported claim content."}
    }
    
    response = "This statement is supported [Ref 1], but this statement is fabricated [Ref 2]."
    
    cleaned_text, citations, invalid_refs = grounding_service.process_citations(response, registry)
    
    # [Ref 1] should resolve, [Ref 2] is invalid and becomes unverified
    assert "fabricated [Ref unverified]" in cleaned_text
    assert "supported [Ref 1]" in cleaned_text
    
    assert len(citations) == 1
    assert citations[0]["ref_key"] == "[Ref 1]"
    assert citations[0]["document_title"] == "Doc A.pdf"
    
    assert len(invalid_refs) == 1
    assert invalid_refs[0] == "[Ref 2]"

def test_evaluate_grounding_score_calculation(grounding_service):
    registry = {
        "[Ref 1]": {"chunk_id": "c1"}
    }
    
    # 1. Fully grounded response (1 citation, 0 invalid refs)
    citations = [{"ref_key": "[Ref 1]"}]
    invalid_refs = []
    
    metrics = grounding_service.evaluate_grounding(
        response_text="The fact is true [Ref 1].",
        registry=registry,
        citations=citations,
        invalid_refs=invalid_refs
    )
    
    assert metrics["evidence_availability"] is True
    assert metrics["citation_validity"] == 1.0
    assert metrics["grounding_score"] > 80.0
    assert metrics["grounding_status"] == "grounded"
    
    # 2. Hallucinated response (1 citation, 1 invalid ref)
    invalid_refs = ["[Ref 2]"]
    metrics_hallucinated = grounding_service.evaluate_grounding(
        response_text="Fact [Ref 1] and fake [Ref 2].",
        registry=registry,
        citations=citations,
        invalid_refs=invalid_refs
    )
    
    assert metrics_hallucinated["citation_validity"] == 0.5
    # Grounding score should drop heavily due to invalid_refs deduction
    assert metrics_hallucinated["grounding_score"] < 60.0
    assert metrics_hallucinated["grounding_status"] == "unverified"

def test_evaluate_grounding_insufficient_evidence(grounding_service):
    registry = {} # Empty
    citations = []
    invalid_refs = []
    
    metrics = grounding_service.evaluate_grounding(
        response_text="Insufficient evidence found in the document(s) to answer this question.",
        registry=registry,
        citations=citations,
        invalid_refs=invalid_refs
    )
    
    assert metrics["evidence_availability"] is False
    assert metrics["insufficient_evidence"] is True
    assert metrics["grounding_score"] == 100.0
    assert metrics["grounding_status"] == "insufficient_evidence"
