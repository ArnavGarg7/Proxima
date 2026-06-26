import re
from typing import Dict, Any, List

class ConfidenceAnalyzer:
    """
    Formal confidence analyzer subsystem.
    Evaluates document text across 4 deterministic dimensions:
    Clarity, Structure, Terminology, and Compliance Signals.
    """

    @staticmethod
    def analyze(document_text: str, document_metadata: dict = None) -> dict:
        if not document_metadata:
            document_metadata = {}
            
        doc_id = document_metadata.get("document_id", "unknown")
        doc_title = document_metadata.get("document_title", "Untitled")

        # Fallback for empty text
        if not document_text or not document_text.strip():
            return ConfidenceAnalyzer._empty_response(doc_id, doc_title)

        # Dimension Scoring
        clarity_score, clarity_diag = ConfidenceAnalyzer._score_clarity(document_text)
        structure_score, structure_diag = ConfidenceAnalyzer._score_structure(document_text)
        term_score, term_diag = ConfidenceAnalyzer._score_terminology(document_text)
        comp_score, comp_diag = ConfidenceAnalyzer._score_compliance_signals(document_text)

        # Compute overall score and grade
        overall_score = ConfidenceAnalyzer._compute_overall_score(
            clarity_score, structure_score, term_score, comp_score
        )
        grade = ConfidenceAnalyzer._grade_from_score(overall_score)

        # Actions & Evidence
        actions = ConfidenceAnalyzer._generate_actions(
            clarity_score, structure_score, term_score, comp_score,
            clarity_diag, structure_diag, term_diag, comp_diag
        )
        evidence = ConfidenceAnalyzer._extract_evidence(document_text, clarity_score, comp_score)

        # Merge diagnostics
        diagnostics = {
            **clarity_diag,
            **structure_diag,
            **term_diag,
            **comp_diag,
            "total_words": len(document_text.split())
        }

        return {
            "document_id": str(doc_id),
            "document_title": str(doc_title),
            "overall_score": round(overall_score, 1),
            "grade": grade,
            "dimensions": {
                "clarity": round(clarity_score, 1),
                "structure": round(structure_score, 1),
                "terminology": round(term_score, 1),
                "compliance_signals": round(comp_score, 1)
            },
            "actions": actions,
            "evidence": evidence,
            "diagnostics": diagnostics
        }

    @staticmethod
    def _empty_response(doc_id: str, doc_title: str) -> dict:
        return {
            "document_id": str(doc_id),
            "document_title": str(doc_title),
            "overall_score": 0.0,
            "grade": "F",
            "dimensions": {
                "clarity": 0,
                "structure": 0,
                "terminology": 0,
                "compliance_signals": 0
            },
            "actions": [
                {
                    "title": "Missing Content",
                    "description": "Document contains no extractable text.",
                    "severity": "high",
                    "dimension": "clarity"
                }
            ],
            "evidence": [],
            "diagnostics": {"error": "Empty text"}
        }

    @staticmethod
    def _score_clarity(text: str) -> tuple[float, dict]:
        words = text.split()
        if not words:
            return 0.0, {"sentence_count": 0, "avg_sentence_length": 0}
            
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        sentence_count = len(sentences)
        avg_sentence_length = len(words) / sentence_count if sentence_count > 0 else len(words)
        
        # Heuristic: Optimal avg sentence length is around 15-20.
        # Penalize if it's too long (> 25) or excessively short (< 5, which often implies OCR garbage/lists).
        score = 100.0
        if avg_sentence_length > 20:
            score -= (avg_sentence_length - 20) * 2
        elif avg_sentence_length < 8:
            score -= (8 - avg_sentence_length) * 5
            
        # Penalize massive words (OCR errors like "TheQuickBrownFox...")
        massive_words = sum(1 for w in words if len(w) > 25)
        score -= massive_words * 5

        score = max(0.0, min(100.0, score))
        return score, {
            "sentence_count": sentence_count,
            "avg_sentence_length": round(avg_sentence_length, 1),
            "massive_words": massive_words
        }

    @staticmethod
    def _score_structure(text: str) -> tuple[float, dict]:
        # Normalize carriage returns
        t = text.replace('\r\n', '\n')
        # Split into blocks based on double newlines
        blocks = [b.strip() for b in re.split(r'\n{2,}', t) if b.strip()]
        
        if not blocks:
            return 0.0, {"paragraph_count": 0, "detected_headings": 0}

        # Heading detection: Short blocks (1-10 words) that don't end in typical punctuation
        headings = [b for b in blocks if len(b.split()) <= 10 and not b.endswith(('.', ',', ';'))]
        
        # Block density: average length of paragraphs
        avg_block_words = sum(len(b.split()) for b in blocks) / len(blocks)
        
        score = 50.0 # Base score for having some structure
        
        # Reward headings
        heading_ratio = len(headings) / len(blocks)
        if 0.05 <= heading_ratio <= 0.3:
            score += 25
        elif heading_ratio > 0.3:
            # Too many short fragments might be bad OCR/tables
            score -= 10
            
        # Penalize giant blocks of text
        if avg_block_words > 150:
            score -= (avg_block_words - 150) * 0.2
        else:
            score += 25 # Good paragraphing
            
        # Detect lists (lines starting with -, *, or 1.)
        list_items = len(re.findall(r'(?m)^[\s]*[-*•\d+]\.?\s', text))
        if list_items > 0:
            score += 10 # Bonus for structured lists

        score = max(0.0, min(100.0, score))
        return score, {
            "paragraph_count": len(blocks),
            "detected_headings": len(headings),
            "list_items": list_items,
            "avg_words_per_paragraph": round(avg_block_words, 1)
        }

    @staticmethod
    def _score_terminology(text: str) -> tuple[float, dict]:
        # Clean text
        words = [re.sub(r'[^a-zA-Z0-9]', '', w).lower() for w in text.split()]
        words = [w for w in words if len(w) >= 5] # Only look at non-trivial words
        
        if not words:
            return 0.0, {"repeated_technical_terms": 0, "acronym_count": 0}

        word_counts = {}
        for w in words:
            word_counts[w] = word_counts.get(w, 0) + 1
            
        # Count words that are >= 6 chars and appear multiple times (signals intentional terminology)
        repeated_technical_terms = sum(1 for w, c in word_counts.items() if len(w) >= 6 and c >= 3)
        
        # Detect acronyms (e.g., NASA, API, HTTP)
        acronyms = len(set(re.findall(r'\b[A-Z]{3,}\b', text)))
        
        score = 40.0
        # Reward consistent technical terms (up to 40 points)
        term_bonus = min(40.0, repeated_technical_terms * 3.0)
        score += term_bonus
        
        # Reward acronyms/concepts (up to 20 points)
        acronym_bonus = min(20.0, acronyms * 2.0)
        score += acronym_bonus
        
        score = max(0.0, min(100.0, score))
        return score, {
            "repeated_technical_terms": repeated_technical_terms,
            "acronym_count": acronyms
        }

    @staticmethod
    def _score_compliance_signals(text: str) -> tuple[float, dict]:
        compliance_keywords = [
            "shall", "must", "required", "prohibited", "comply", "obligation", 
            "risk", "policy", "regulation", "audit", "review", "approved", 
            "controls", "liability", "indemnify", "warrant", "breach", 
            "term", "condition"
        ]
        text_lower = text.lower()
        
        hits = 0
        for kw in compliance_keywords:
            # Whole word boundary search
            hits += len(re.findall(r'\b' + kw + r'\b', text_lower))
            
        # Density: hits per 1000 words
        word_count = len(text.split())
        if word_count == 0:
            return 0.0, {"compliance_keyword_hits": 0, "compliance_density": 0.0}
            
        density = (hits / word_count) * 1000
        
        # If density is >= 10 per 1000 words, that's a 100 score.
        score = min(100.0, density * 10.0)
        
        return score, {
            "compliance_keyword_hits": hits,
            "compliance_density_per_1k": round(density, 1)
        }

    @staticmethod
    def _compute_overall_score(clarity: float, structure: float, term: float, comp: float) -> float:
        # Equal weighting for now, but could be adjusted
        return (clarity + structure + term + comp) / 4.0

    @staticmethod
    def _grade_from_score(score: float) -> str:
        if score >= 85: return "A"
        if score >= 70: return "B"
        if score >= 55: return "C"
        if score >= 40: return "D"
        return "F"

    @staticmethod
    def _generate_actions(clarity, structure, term, comp, c_diag, s_diag, t_diag, comp_diag) -> List[Dict[str, str]]:
        actions = []
        
        if clarity < 65:
            avg_len = c_diag.get("avg_sentence_length", 0)
            actions.append({
                "title": "Improve Sentence Clarity",
                "description": f"Average sentence length is {avg_len} words, which may reduce readability.",
                "severity": "high" if clarity < 40 else "medium",
                "dimension": "clarity"
            })
            
        if structure < 60:
            actions.append({
                "title": "Add Structural Formatting",
                "description": "Document lacks clear headings or consists of overly dense text blocks.",
                "severity": "medium",
                "dimension": "structure"
            })
            
        if term < 50:
            actions.append({
                "title": "Strengthen Domain Terminology",
                "description": "The text lacks consistent technical vocabulary or acronym usage.",
                "severity": "low",
                "dimension": "terminology"
            })
            
        if comp < 40:
            actions.append({
                "title": "Enhance Compliance Language",
                "description": "Few explicit obligations, policies, or risk control keywords were detected.",
                "severity": "medium",
                "dimension": "compliance_signals"
            })
            
        if not actions:
            actions.append({
                "title": "Maintain Document Quality",
                "description": "All dimensions scored well. Ensure future additions match this standard.",
                "severity": "low",
                "dimension": "clarity"
            })
            
        return actions

    @staticmethod
    def _clip_excerpt(text: str, max_len: int = 300) -> str:
        if not text:
            return ""
        # Aggressively normalize whitespace (except newlines, we want to keep paragraph breaks)
        text = re.sub(r'[ \t]+', ' ', text)
        # Collapse >2 newlines into 2
        text = re.sub(r'\n{3,}', '\n\n', text).strip()
        
        if len(text) <= max_len:
            return text
            
        # Try to find a sentence boundary
        window = text[max_len-50:max_len+50]
        match = re.search(r'[.!?]\s', window)
        if match:
            end_idx = max_len - 50 + match.end()
            return text[:end_idx].strip()
        
        return text[:max_len].strip() + "..."

    @staticmethod
    def _extract_evidence(text: str, clarity_score: float, comp_score: float) -> List[Dict[str, str]]:
        evidence = []
        
        # Split into blocks for finding good excerpts
        blocks = [b.strip() for b in re.split(r'\n{2,}', text.replace('\r\n', '\n')) if b.strip()]
        if not blocks:
            return evidence
            
        # 1. Structure/Clarity evidence: grab a representative block from the beginning
        sample = blocks[0] if len(blocks) == 1 else blocks[min(1, len(blocks)-1)]
        evidence.append({
            "title": "Clarity & Structure",
            "description": "Sample segment reflecting the detected sentence length and formatting.",
            "dimension": "clarity",
            "excerpt": ConfidenceAnalyzer._clip_excerpt(sample)
        })
        
        # 2. Compliance evidence: grab a block with compliance keywords, if possible
        comp_keywords = ["shall", "must", "policy", "liability", "regulation", "risk", "comply"]
        comp_block = None
        for b in blocks:
            if any(k in b.lower() for k in comp_keywords):
                comp_block = b
                break
                
        if comp_block:
            evidence.append({
                "title": "Compliance Context",
                "description": "Excerpt containing detected policy or obligation signals.",
                "dimension": "compliance_signals",
                "excerpt": ConfidenceAnalyzer._clip_excerpt(comp_block)
            })
        elif len(blocks) > 2:
            # Fallback
            evidence.append({
                "title": "Terminology Usage",
                "description": "Excerpt showing general domain vocabulary usage.",
                "dimension": "terminology",
                "excerpt": ConfidenceAnalyzer._clip_excerpt(blocks[len(blocks)//2])
            })
            
        return evidence
