"""
Quality Heuristic Engine (QHE).

Analyzes AI-generated output to produce confidence and risk scores based on
heuristics. Classifies quality into High (80+), Medium (65-79), and Low (50-64).
"""

from typing import Dict, Any
import re

class QualityHeuristicEngine:
    def __init__(self):
        """
        Initialize the QualityHeuristicEngine.
        """
        # Simple heuristics for Phase 2 (No actual LLM-as-a-judge)
        self.hedge_phrases = [
            "i don't know", "i am not sure", "it's possible", "perhaps", 
            "might be", "could be", "as an ai", "cannot verify"
        ]
        self.risk_phrases = [
            "must consult", "legal advice", "medical advice", "seek professional", 
            "at your own risk", "not responsible", "disclaimer"
        ]

    def evaluate_response(self, prompt: str, ai_response: str, domain: str) -> Dict[str, Any]:
        """
        Evaluates the AI response against heuristics and returns a quality report.
        """
        score = self._calculate_confidence(ai_response)
        quality = self._classify_quality(score)
        risk = self._classify_risk(ai_response)

        return {
            "confidence_score": score,
            "quality_classification": quality,
            "risk_classification": risk
        }

    def _calculate_confidence(self, ai_response: str) -> float:
        """
        Calculates a raw confidence score between 0 and 100.
        """
        if not ai_response:
            return 0.0

        base_score = 90.0
        lower_resp = ai_response.lower()

        # Penalize for hedging
        for phrase in self.hedge_phrases:
            if phrase in lower_resp:
                base_score -= 10.0
        
        # Penalize for overly short answers
        if len(ai_response) < 50:
            base_score -= 15.0

        return max(0.0, min(100.0, base_score))

    def _classify_quality(self, score: float) -> str:
        """
        Classifies the quality based on rigid thresholds:
        High: 80+, Medium: 65-79, Low: < 65.
        (Task requested 50-64 = Low, so anything below 65 is Low)
        """
        if score >= 80:
            return "High"
        elif score >= 65:
            return "Medium"
        else:
            return "Low"

    def _classify_risk(self, ai_response: str) -> str:
        """
        Heuristic risk detection. Returns 'High', 'Medium', or 'Low' risk.
        """
        lower_resp = ai_response.lower()
        risk_count = sum(1 for phrase in self.risk_phrases if phrase in lower_resp)
        
        if risk_count >= 2:
            return "High"
        elif risk_count == 1:
            return "Medium"
        return "Low"
