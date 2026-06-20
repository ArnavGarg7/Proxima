import pytest
from proxima.services.qhe import QualityHeuristicEngine

@pytest.fixture
def qhe():
    return QualityHeuristicEngine()

def test_confidence_scoring_high(qhe):
    response = "The summary of the document clearly states the obligations. The plaintiff must pay damages."
    result = qhe.evaluate_response("What does it say?", response, "legal")
    
    assert result["confidence_score"] == 90.0
    assert result["quality_classification"] == "High"

def test_confidence_scoring_medium(qhe):
    # Length is decent, but includes a hedge phrase
    response = "I am not sure, but it seems the document states that the plaintiff must pay damages. Here is a longer explanation so it does not trigger the short penalty."
    result = qhe.evaluate_response("What does it say?", response, "legal")
    
    # 90 base - 10 for "i am not sure"
    assert result["confidence_score"] == 80.0
    assert result["quality_classification"] == "High"

def test_confidence_scoring_low(qhe):
    # Very short AND contains hedge
    response = "I don't know."
    result = qhe.evaluate_response("Tell me", response, "legal")
    
    # 90 base - 10 hedge - 15 short = 65
    # Let's add another hedge to push it below 65
    response = "I don't know, as an AI, I cannot verify this."
    result = qhe.evaluate_response("Tell me", response, "legal")
    
    assert result["confidence_score"] < 65.0
    assert result["quality_classification"] == "Low"

def test_risk_classification(qhe):
    # Contains 2 risk phrases
    response = "You must consult a lawyer for legal advice."
    result = qhe.evaluate_response("What should I do?", response, "legal")
    
    assert result["risk_classification"] == "High"
    
    # Contains 1 risk phrase
    response = "Please read the disclaimer."
    result = qhe.evaluate_response("What should I do?", response, "legal")
    
    assert result["risk_classification"] == "Medium"
