import re
import json
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.services.model_registry import model_registry

class DomainRadar:
    """
    Domain Radar: Document-domain classification and routing intelligence layer.
    """

    @staticmethod
    def _build_document_profile(text: str, metadata: dict = None) -> dict:
        lines = text.split('\n')
        char_count = len(text)
        word_count = len(text.split())
        line_count = len(lines)
        
        paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
        heading_like_lines = sum(1 for line in lines if len(line.strip()) > 0 and len(line.strip()) < 80 and (line.strip().isupper() or line.strip().istitle()))
        bullet_like_lines = sum(1 for line in lines if re.match(r'^\s*[-*•\d\.]', line))
        table_like_lines = sum(1 for line in lines if '|' in line or '\t' in line)
        
        numeric_line_ratio = sum(1 for line in lines if re.search(r'\d', line)) / max(line_count, 1)

        return {
            "char_count": char_count,
            "word_count": word_count,
            "line_count": line_count,
            "paragraph_count": paragraph_count,
            "heading_like_lines": heading_like_lines,
            "bullet_like_lines": bullet_like_lines,
            "table_like_lines": table_like_lines,
            "numeric_line_ratio": numeric_line_ratio
        }

    @staticmethod
    def _score_clinical(text: str, profile: dict) -> dict:
        text_lower = text.lower()
        signals = []
        score = 0.0

        keywords = {
            "chief complaint": 0.3,
            "diagnosis": 0.2,
            "diagnoses": 0.2,
            "treatment plan": 0.3,
            "patient": 0.1,
            "medication": 0.2,
            "dosage": 0.2,
            "vitals": 0.2,
            "symptoms": 0.2,
            "radiology": 0.2,
            "history of present illness": 0.3,
            "assessment and plan": 0.3
        }

        for kw, weight in keywords.items():
            if kw in text_lower:
                score += weight
                signals.append({"label": f"Clinical term: {kw}", "description": f"Detected clinical terminology '{kw}'.", "strength": "high" if weight >= 0.3 else "medium"})

        # Cap score
        score = min(score, 0.95)
        return {"domain": "clinical", "score": score, "matched_signals": signals, "reasoning_notes": ["Clinical vocabulary density"]}

    @staticmethod
    def _score_legal(text: str, profile: dict) -> dict:
        text_lower = text.lower()
        signals = []
        score = 0.0

        keywords = {
            "shall": 0.1,
            "hereby": 0.15,
            "liability": 0.2,
            "indemnify": 0.3,
            "governing law": 0.3,
            "agreement": 0.15,
            "clause": 0.1,
            "warranty": 0.2,
            "effective date": 0.2,
            "jurisdiction": 0.2,
            "confidentiality": 0.2,
            "breach of contract": 0.3
        }

        for kw, weight in keywords.items():
            if kw in text_lower:
                score += weight
                signals.append({"label": f"Legal term: {kw}", "description": f"Detected legal phrasing '{kw}'.", "strength": "high" if weight >= 0.3 else "medium"})

        if re.search(r'\b\d+\.\d+\s+[A-Z]', text):
            score += 0.2
            signals.append({"label": "Contract numbering", "description": "Numbered clauses consistent with contract structure.", "strength": "medium"})

        score = min(score, 0.95)
        return {"domain": "legal", "score": score, "matched_signals": signals, "reasoning_notes": ["Legal phrasing and structure"]}

    @staticmethod
    def _score_academic(text: str, profile: dict) -> dict:
        text_lower = text.lower()
        signals = []
        score = 0.0

        keywords = {
            "semester": 0.2,
            "academic": 0.2,
            "course": 0.1,
            "lecture": 0.2,
            "assignment": 0.2,
            "professor": 0.2,
            "syllabus": 0.3,
            "credits": 0.15,
            "midsem": 0.3,
            "endsem": 0.3,
            "timetable": 0.2,
            "curriculum": 0.2
        }

        for kw, weight in keywords.items():
            if kw in text_lower:
                score += weight
                signals.append({"label": f"Academic term: {kw}", "description": f"Detected educational terminology '{kw}'.", "strength": "high" if weight >= 0.3 else "medium"})

        score = min(score, 0.95)
        return {"domain": "academic", "score": score, "matched_signals": signals, "reasoning_notes": ["Academic/educational vocabulary"]}

    @staticmethod
    def _score_technical(text: str, profile: dict) -> dict:
        text_lower = text.lower()
        signals = []
        score = 0.0

        keywords = {
            "architecture": 0.15,
            "backend": 0.15,
            "frontend": 0.15,
            "api": 0.2,
            "endpoint": 0.2,
            "schema": 0.2,
            "database": 0.15,
            "deployment": 0.2,
            "vector": 0.1,
            "retrieval": 0.1,
            "model": 0.1,
            "pipeline": 0.15
        }

        for kw, weight in keywords.items():
            if kw in text_lower:
                score += weight
                signals.append({"label": f"Technical term: {kw}", "description": f"Detected engineering terminology '{kw}'.", "strength": "high" if weight >= 0.2 else "medium"})

        score = min(score, 0.95)
        return {"domain": "technical", "score": score, "matched_signals": signals, "reasoning_notes": ["Engineering and systems vocabulary"]}

    @staticmethod
    def _score_business(text: str, profile: dict) -> dict:
        text_lower = text.lower()
        signals = []
        score = 0.0

        keywords = {
            "revenue": 0.2,
            "kpi": 0.25,
            "stakeholder": 0.2,
            "roadmap": 0.2,
            "strategy": 0.2,
            "proposal": 0.15,
            "market": 0.1,
            "objective": 0.1,
            "initiative": 0.15,
            "action items": 0.25,
            "meeting notes": 0.25
        }

        for kw, weight in keywords.items():
            if kw in text_lower:
                score += weight
                signals.append({"label": f"Business term: {kw}", "description": f"Detected business/planning terminology '{kw}'.", "strength": "high" if weight >= 0.25 else "medium"})

        score = min(score, 0.95)
        return {"domain": "business", "score": score, "matched_signals": signals, "reasoning_notes": ["Corporate and planning vocabulary"]}

    @staticmethod
    def _score_general(text: str, profile: dict) -> dict:
        # General acts as a baseline fallback.
        return {"domain": "general", "score": 0.2, "matched_signals": [{"label": "Fallback", "description": "Baseline general document score.", "strength": "low"}], "reasoning_notes": ["Baseline"]}

    @staticmethod
    def _rank_domain_candidates(raw_scores: list[dict]) -> list[dict]:
        sorted_scores = sorted(raw_scores, key=lambda x: x['score'], reverse=True)
        results = []
        for s in sorted_scores:
            val = s['score']
            if val >= 0.7:
                conf = "high"
            elif val >= 0.4:
                conf = "medium"
            else:
                conf = "low"
            
            results.append({
                "domain": s['domain'],
                "score": round(val, 2),
                "confidence_label": conf,
                "matched_signals": s.get('matched_signals', []),
                "reasoning_notes": s.get('reasoning_notes', [])
            })
        return results

    @staticmethod
    async def analyze(db: AsyncSession, document_text: str, document_metadata: dict = None) -> dict:
        if not document_text or not document_text.strip():
            raise ValueError("Document text is empty")
            
        profile = DomainRadar._build_document_profile(document_text, document_metadata)
        
        raw_scores = [
            DomainRadar._score_clinical(document_text, profile),
            DomainRadar._score_legal(document_text, profile),
            DomainRadar._score_academic(document_text, profile),
            DomainRadar._score_technical(document_text, profile),
            DomainRadar._score_business(document_text, profile),
            DomainRadar._score_general(document_text, profile)
        ]
        
        ranked_candidates = DomainRadar._rank_domain_candidates(raw_scores)
        top_candidate = ranked_candidates[0]
        
        all_signals = []
        for c in ranked_candidates:
            if c['score'] > 0.2:  # Only grab signals from somewhat relevant domains
                all_signals.extend(c['matched_signals'])
                
        # Deduplicate signals by label
        seen = set()
        deduped_signals = []
        for s in all_signals:
            if s['label'] not in seen:
                seen.add(s['label'])
                # Only keep top ~5 signals for LLM prompt context to save tokens
                if len(deduped_signals) < 5:
                    deduped_signals.append(s)

        # Stage C: AI Resolution
        model = await model_registry.get_default_generation(db)
        
        schema = {
            "type": "OBJECT",
            "properties": {
                "primary_domain": {
                    "type": "OBJECT",
                    "properties": {
                        "domain": {"type": "STRING", "enum": ["clinical", "legal", "academic", "technical", "business", "general"]},
                        "score": {"type": "NUMBER"},
                        "confidence_label": {"type": "STRING", "enum": ["high", "medium", "low"]}
                    }
                },
                "summary": {"type": "STRING"},
                "recommended_surfaces": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "surface": {"type": "STRING", "enum": ["workspace", "audit", "clinical", "compare", "code"]},
                            "reason": {"type": "STRING"}
                        }
                    }
                }
            },
            "required": ["primary_domain", "summary", "recommended_surfaces"]
        }

        # Excerpt to save tokens
        excerpt = document_text[:4000] if len(document_text) > 4000 else document_text

        system_prompt = f"""
You are the Proxima Domain Radar resolver. Your job is to classify the provided document excerpt into one of the curated domains:
[clinical, legal, academic, technical, business, general]

We have already deterministically scored the document.
Top Deterministic Candidate: {top_candidate['domain']} (Score: {top_candidate['score']})
All Candidates: {[c['domain'] for c in ranked_candidates[:3]]}
Signals Detected: {json.dumps(deduped_signals)}

Instructions:
1. If the top deterministic candidate makes sense given the excerpt, stick with it. Only override if it is clearly a false positive.
2. Provide a concise 'summary' of why this domain was chosen and what the document is.
3. Provide 'recommended_surfaces' detailing what Proxima tools (workspace, audit, clinical, compare, code) are best suited for this document. For example:
   - Clinical documents -> "clinical", "audit"
   - Academic/Business -> "workspace", "audit"
   - Code/Technical -> "workspace", "code"
4. Output STRICT JSON matching the schema.
"""

        user_message = f"Excerpt:\n```\n{excerpt}\n```\n\nResolve the domain and provide the summary and recommended surfaces."

        try:
            import google.generativeai as genai
            from google.generativeai import GenerativeModel
            
            gm = GenerativeModel(model.model_id, system_instruction=system_prompt)
            result = gm.generate_content(
                user_message,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.1
                )
            )
            
            resolution = json.loads(result.text)
            
            # Reconstruct the final contract
            final_response = {
                "document_id": document_metadata.get("id", "unknown") if document_metadata else "unknown",
                "document_title": document_metadata.get("title", "Unknown Document") if document_metadata else "Unknown Document",
                "primary_domain": resolution["primary_domain"],
                "candidate_domains": [
                    {
                        "domain": c["domain"],
                        "score": c["score"],
                        "confidence_label": c["confidence_label"]
                    } for c in ranked_candidates
                ],
                "document_profile": {
                    "word_count": profile["word_count"],
                    "line_count": profile["line_count"],
                    "paragraph_count": profile["paragraph_count"],
                    "heading_like_lines": profile["heading_like_lines"],
                    "table_like_lines": profile["table_like_lines"]
                },
                "signals": deduped_signals,
                "summary": resolution["summary"],
                "recommended_surfaces": resolution["recommended_surfaces"],
                "diagnostics": {
                    "llm_resolution_used": True,
                    "domains_scored": len(ranked_candidates),
                    "top_deterministic_domain": top_candidate["domain"]
                }
            }
            
            return final_response
            
        except Exception as e:
            # Fallback if LLM fails
            final_response = {
                "document_id": document_metadata.get("id", "unknown") if document_metadata else "unknown",
                "document_title": document_metadata.get("title", "Unknown Document") if document_metadata else "Unknown Document",
                "primary_domain": {
                    "domain": top_candidate["domain"],
                    "score": top_candidate["score"],
                    "confidence_label": top_candidate["confidence_label"]
                },
                "candidate_domains": [
                    {
                        "domain": c["domain"],
                        "score": c["score"],
                        "confidence_label": c["confidence_label"]
                    } for c in ranked_candidates
                ],
                "document_profile": {
                    "word_count": profile["word_count"],
                    "line_count": profile["line_count"],
                    "paragraph_count": profile["paragraph_count"],
                    "heading_like_lines": profile["heading_like_lines"],
                    "table_like_lines": profile["table_like_lines"]
                },
                "signals": deduped_signals,
                "summary": f"Classified deterministically as {top_candidate['domain']} due to LLM fallback.",
                "recommended_surfaces": [{"surface": "workspace", "reason": "Default fallback recommendation."}],
                "diagnostics": {
                    "llm_resolution_used": False,
                    "domains_scored": len(ranked_candidates),
                    "error": str(e)
                }
            }
            return final_response
