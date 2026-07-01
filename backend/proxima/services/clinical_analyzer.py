import re
import json
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.services.providers.google_provider import GoogleProvider

# --- Pydantic Schemas for Stage C LLM Output ---

class DocumentDomainHint(BaseModel):
    is_clinical_like: bool
    confidence: str
    reason: str

class Confidence(BaseModel):
    overall: int
    label: str

class ClinicalSnapshot(BaseModel):
    chief_complaint_short: str
    top_assessment: str
    top_plan_item: str

class DocumentProfile(BaseModel):
    word_count: int
    line_count: int
    paragraph_count: int
    heading_count: int

class ClinicalSummary(BaseModel):
    chief_complaint: str
    presenting_summary: str
    key_findings: list[str]
    diagnoses_or_assessment: list[str]
    medications_or_therapies: list[str]
    tests_or_imaging: list[str]
    plan_items: list[str]

class RiskFlag(BaseModel):
    title: str
    description: str
    severity: str
    category: str

class DetectedSignal(BaseModel):
    label: str
    description: str
    strength: str

class SectionEvidence(BaseModel):
    title: str
    description: str
    excerpt: str

class ClinicalResponseSchema(BaseModel):
    document_domain_hint: DocumentDomainHint
    summary: str
    confidence: Confidence
    clinical_snapshot: ClinicalSnapshot
    document_profile: DocumentProfile
    clinical_summary: ClinicalSummary
    risk_flags: list[RiskFlag]
    detected_signals: list[DetectedSignal]
    section_evidence: list[SectionEvidence]

# --- Clinical Analyzer Service ---

class ClinicalAnalyzer:

    @classmethod
    async def analyze(cls, db: AsyncSession, text: str, metadata: dict = None) -> dict:
        """Main entry point for Clinical Analysis."""
        
        # Stage A: Deterministic Extraction
        profile = cls._build_document_profile(text)
        sections = cls._extract_clinical_sections(text)
        entities = cls._extract_clinical_entities(text)
        risk_flags_seed = cls._detect_clinical_risk_flags(text, sections, entities)
        
        # Determine basic clinical likelihood for the prompt
        is_clinical = len(sections) > 0 or len(entities.get("medications", [])) > 0 or len(entities.get("diagnoses", [])) > 0
        
        # Stage B: Deterministic Draft Object
        draft = {
            "document_profile": profile,
            "sections_detected": sections,
            "entity_candidates": entities,
            "risk_flags_seed": risk_flags_seed,
            "clinical_signal_summary": {
                "has_assessment_section": "assessment" in sections or "diagnosis" in sections,
                "has_plan_section": "plan" in sections or "follow_up" in sections,
                "has_medication_mentions": len(entities.get("medications", [])) > 0,
                "is_likely_clinical": is_clinical
            }
        }
        
        # Stage C: Controlled LLM Synthesis
        return await cls._run_llm_clinical_synthesis(text, draft, metadata)

    @classmethod
    def _build_document_profile(cls, text: str) -> dict:
        lines = text.split('\n')
        paragraphs = text.split('\n\n')
        words = text.split()
        
        heading_pattern = re.compile(r'^([A-Z][A-Za-z0-9\s/]+):?\s*$')
        headings = [line for line in lines if heading_pattern.match(line.strip()) and len(line.strip()) < 50]
        
        return {
            "word_count": len(words),
            "line_count": len(lines),
            "paragraph_count": len([p for p in paragraphs if p.strip()]),
            "heading_count": len(headings),
        }

    @classmethod
    def _extract_clinical_sections(cls, text: str) -> dict:
        sections = {}
        text_lower = text.lower()
        
        markers = {
            "chief_complaint": [r"chief complaint", r"reason for visit", r"cc:", r"complaint:"],
            "hpi": [r"history of present illness", r"hpi:"],
            "past_medical_history": [r"past medical history", r"pmh:"],
            "medications": [r"medications", r"current meds", r"rx:"],
            "allergies": [r"allergies"],
            "physical_exam": [r"physical exam", r"pe:", r"objective:"],
            "labs_imaging": [r"labs", r"imaging", r"results"],
            "assessment": [r"assessment", r"impression", r"diagnosis", r"diagnoses"],
            "plan": [r"plan", r"recommendations", r"follow-up", r"treatment"]
        }
        
        for section, patterns in markers.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    sections[section] = True
                    break
        return sections

    @classmethod
    def _extract_clinical_entities(cls, text: str) -> dict:
        text_lower = text.lower()
        
        entities = {
            "symptoms": [],
            "diagnoses": [],
            "medications": [],
            "tests_or_imaging": [],
            "followup_terms": [],
            "risk_terms": []
        }
        
        symptom_keywords = ["pain", "fever", "cough", "nausea", "vomiting", "shortness of breath", "dyspnea", "fatigue", "weakness"]
        medication_keywords = ["mg", "ml", "tablet", "capsule", "po", "bid", "qd", "prn", "dose", "prescribed"]
        test_keywords = ["x-ray", "mri", "ct", "blood", "cbc", "cmp", "ecg", "ekg", "ultrasound", "scan"]
        followup_keywords = ["follow up", "return", "referral", "consult", "weeks", "months", "days"]
        risk_keywords = ["rule out", "possible", "unclear", "likely", "suspected", "denies", "no known"]
        
        for k in symptom_keywords:
            if k in text_lower: entities["symptoms"].append(k)
        for k in medication_keywords:
            if k in text_lower: entities["medications"].append(k)
        for k in test_keywords:
            if k in text_lower: entities["tests_or_imaging"].append(k)
        for k in followup_keywords:
            if k in text_lower: entities["followup_terms"].append(k)
        for k in risk_keywords:
            if k in text_lower: entities["risk_terms"].append(k)
            
        return entities

    @classmethod
    def _detect_clinical_risk_flags(cls, text: str, sections: dict, entities: dict) -> list[dict]:
        flags = []
        text_lower = text.lower()
        
        # Ambiguity flags
        ambiguous_terms = ["rule out", "possible", "unclear", "suspected"]
        found_ambiguity = [t for t in ambiguous_terms if t in text_lower]
        if found_ambiguity:
            flags.append({
                "title": "Assessment contains uncertainty",
                "description": f"The note uses tentative diagnostic language such as '{found_ambiguity[0]}'.",
                "severity": "medium",
                "category": "ambiguity"
            })
            
        # Document quality flags
        if len(text.split()) < 50:
            flags.append({
                "title": "Very short document",
                "description": "The note is extremely brief and may be missing crucial clinical context.",
                "severity": "high",
                "category": "document_quality"
            })
            
        # Non-clinical input flag
        if len(sections) == 0 and len(entities.get("medications", [])) == 0 and len(entities.get("diagnoses", [])) == 0:
            flags.append({
                "title": "Document may not be a clinical note",
                "description": "The selected document lacks strong clinical section patterns and appears weakly aligned with clinical documentation.",
                "severity": "high",
                "category": "non_clinical_input"
            })
            
        # Missing information
        if "assessment" not in sections and "plan" not in sections and len(sections) > 0:
             flags.append({
                "title": "Missing core clinical sections",
                "description": "The note appears clinical but lacks explicit Assessment or Plan sections.",
                "severity": "medium",
                "category": "missing_information"
            })
             
        return flags

    @classmethod
    async def _run_llm_clinical_synthesis(cls, text: str, draft: dict, metadata: dict) -> dict:
        excerpt = text[:4000]  # Truncate for prompt safety
        
        system_prompt = """You are the Proxima Clinical Analyzer backend service.
Your job is to structure a clinical note into a strict JSON format based on the deterministic draft provided.

CRITICAL RULES:
1. DO NOT invent diagnoses not supported by the note.
2. DO NOT recommend treatment beyond what the note states.
3. DO NOT provide patient-specific medical advice.
4. If information is missing, use "Not clearly stated in the note" or empty arrays.
5. Preserve any uncertainty language from the note exactly.
6. The document_domain_hint must accurately reflect if the document is actually a clinical note. If it's an engineering document, say is_clinical_like=false and explain why.
7. Risk flags must use categories: 'ambiguity', 'missing_information', 'followup_gap', 'medication_incomplete', 'document_quality', 'non_clinical_input'.
8. Section Evidence excerpts MUST be exact substrings from the note (clean up whitespace). Clip to max 250 chars.

Output ONLY valid JSON matching this exact schema:
{
  "document_domain_hint": {"is_clinical_like": true, "confidence": "high", "reason": ""},
  "summary": "",
  "confidence": {"overall": 80, "label": "high"},
  "clinical_snapshot": {"chief_complaint_short": "", "top_assessment": "", "top_plan_item": ""},
  "document_profile": {"word_count": 0, "line_count": 0, "paragraph_count": 0, "heading_count": 0},
  "clinical_summary": {
    "chief_complaint": "", "presenting_summary": "",
    "key_findings": [], "diagnoses_or_assessment": [],
    "medications_or_therapies": [], "tests_or_imaging": [], "plan_items": []
  },
  "risk_flags": [{"title": "", "description": "", "severity": "", "category": ""}],
  "detected_signals": [{"label": "", "description": "", "strength": ""}],
  "section_evidence": [{"title": "", "description": "", "excerpt": ""}]
}
"""

        user_prompt = f"""Target Document Metadata: {json.dumps(metadata or {})}
Deterministic Draft Findings:
{json.dumps(draft, indent=2)}

--- TARGET DOCUMENT TEXT ---
{excerpt}
--- END DOCUMENT TEXT ---

Generate the structured ClinicalResponseSchema JSON."""

        import os
        import asyncio
        import google.generativeai as genai
        
        # Use Groq (Gemini free-tier quota is exhausted)
        from openai import AsyncOpenAI as _AsyncOpenAI
        _client = _AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1"
        )
        chat_completion = await _client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.0
        )
        response_text = chat_completion.choices[0].message.content
        response = json.loads(response_text)
        
        # Inject standard metadata fields
        response["document_id"] = metadata.get("id", "unknown") if metadata else "unknown"
        response["document_title"] = metadata.get("title", "Clinical Note") if metadata else "Clinical Note"
        
        # Ensure we don't accidentally drop the document profile
        if "document_profile" not in response or not response["document_profile"].get("word_count"):
             response["document_profile"] = draft["document_profile"]
             
        # Merge draft detected signals into the response if the LLM missed them or hallucinated
        signals = []
        if draft["clinical_signal_summary"]["has_assessment_section"]:
             signals.append({"label": "Assessment detected", "description": "A structured assessment section was found.", "strength": "high"})
        if draft["clinical_signal_summary"]["has_plan_section"]:
             signals.append({"label": "Plan detected", "description": "A structured plan or follow-up section was found.", "strength": "high"})
        if draft["clinical_signal_summary"]["has_medication_mentions"]:
             signals.append({"label": "Medication mentions", "description": "Medication-like entities were identified.", "strength": "medium"})
        if not draft["clinical_signal_summary"]["is_likely_clinical"]:
             signals.append({"label": "Weak clinical structure", "description": "Did not match standard clinical note formatting.", "strength": "low"})
             
        if not response.get("detected_signals"):
            response["detected_signals"] = signals
            
        return response
