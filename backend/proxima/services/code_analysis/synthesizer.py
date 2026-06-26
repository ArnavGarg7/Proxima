import os
import json
from typing import List, Dict, Any
from groq import AsyncGroq
from pydantic import BaseModel, Field

# --- LLM Schemas ---

class ReviewPriority(BaseModel):
    title: str = Field(description="Actionable fix title, e.g. 'Remove eval()'")
    severity: str = Field(description="HIGH, MEDIUM, or LOW")
    description: str = Field(description="Brief explanation of why it needs fixing.")

class IntelligenceCard(BaseModel):
    title: str = Field(description="Title of the issue")
    severity: str = Field(description="HIGH, MEDIUM, or LOW")
    line: int = Field(description="Line number where issue occurs")
    reason: str = Field(description="Why this is an issue")
    recommendation: str = Field(description="How to fix it")
    evidence_old: str = Field(description="Snippet of the old code")

class CodeLLMSynthesis(BaseModel):
    executive_summary: str = Field(description="High-level 2-3 sentence summary of the code's quality")
    overall_score: int = Field(description="0-100 score")
    security_score: int = Field(description="0-100 score")
    maintainability_score: int = Field(description="0-100 score")
    documentation_score: int = Field(description="0-100 score")
    performance_score: int = Field(description="0-100 score")
    
    review_priorities: List[ReviewPriority] = Field(description="List of top priorities ordered by impact")
    
    security_findings: List[IntelligenceCard] = Field(description="Security specific cards")
    maintainability_findings: List[IntelligenceCard] = Field(description="Maintainability cards")
    performance_findings: List[IntelligenceCard] = Field(description="Performance cards")
    documentation_findings: List[IntelligenceCard] = Field(description="Documentation cards")

async def run_llm_synthesis(code: str, language: str, metrics: dict, security: list, maintainability: list) -> Dict[str, Any]:
    """
    Synthesizes the deterministic findings using LLM.
    Implements Graceful LLM Failure if Groq fails.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    
    try:
        client = AsyncGroq(api_key=api_key)
        
        system_prompt = f"""You are a senior {language} code reviewer.
Analyze the provided code and deterministic metrics.
You MUST output strictly in JSON format matching the schema.

Deterministic Context:
Language: {language}
Metrics: {json.dumps(metrics)}
Pre-computed Security Risks: {json.dumps(security)}
Pre-computed Maintainability Risks: {json.dumps(maintainability)}
"""
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Code to review:\n```\n{code}\n```"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content
        return json.loads(result_text)
        
    except Exception as e:
        print(f"LLM Synthesis failed: {e}")
        # Graceful Failure
        return {
            "executive_summary": "Deterministic review completed. Executive summary could not be generated because the AI synthesis step was unavailable. All metrics, security findings, maintainability issues, and evidence below remain valid.",
            "overall_score": 0,
            "security_score": 0,
            "maintainability_score": 0,
            "documentation_score": 0,
            "performance_score": 0,
            "review_priorities": [
                {"title": s["title"], "severity": s["severity"], "description": s["description"]} for s in security
            ] + [
                {"title": m["title"], "severity": m["severity"], "description": m["description"]} for m in maintainability
            ],
            "security_findings": [
                {
                    "title": s["title"], 
                    "severity": s["severity"], 
                    "line": s.get("line", 0), 
                    "reason": s.get("description", ""), 
                    "recommendation": "Review and fix immediately.", 
                    "evidence_old": s.get("evidence", "")
                } for s in security
            ],
            "maintainability_findings": [
                {
                    "title": m["title"], 
                    "severity": m["severity"], 
                    "line": m.get("line", 0), 
                    "reason": m.get("description", ""), 
                    "recommendation": "Refactor to improve readability.", 
                    "evidence_old": m.get("evidence", "")
                } for m in maintainability
            ],
            "performance_findings": [],
            "documentation_findings": []
        }
