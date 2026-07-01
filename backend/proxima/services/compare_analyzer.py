import re
import json
import difflib
import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Pydantic Schemas for LLM Synthesis
# ---------------------------------------------------------------------------

class CompareSnapshot(BaseModel):
    similarity_score: float
    overall_change_level: str
    added_sections_count: int
    removed_sections_count: int
    modified_sections_count: int
    overall_risk: str
    confidence: str

class ReviewerPriority(BaseModel):
    title: str
    severity: str
    description: str

class StructuralChange(BaseModel):
    change_type: str  # "Heading Added", "Heading Removed", "Section Reordered"
    heading: str
    description: str

class SemanticChange(BaseModel):
    category: str
    old_value: str
    new_value: str
    description: str

class RiskChange(BaseModel):
    title: str
    severity: str
    description: str

class CompareEvidence(BaseModel):
    label: str
    old_excerpt: Optional[str]
    new_excerpt: Optional[str]

class DocumentProfileStats(BaseModel):
    word_count: int
    paragraph_count: int
    heading_count: int
    list_count: int

class DocumentProfileDelta(BaseModel):
    source: DocumentProfileStats
    target: DocumentProfileStats
    delta: Dict[str, int]

class CompareResponseSchema(BaseModel):
    similarity_score: float
    overall_change_level: str
    executive_summary: str
    
    change_snapshot: CompareSnapshot
    
    structural_changes: List[StructuralChange]
    semantic_changes: List[SemanticChange]
    reviewer_priorities: List[ReviewerPriority]
    risk_changes: List[RiskChange]
    
    evidence: List[CompareEvidence]
    deterministic_signals: List[str]
    document_profile: DocumentProfileDelta


# ---------------------------------------------------------------------------
# Stage A & B - Deterministic extraction and structure
# ---------------------------------------------------------------------------

def _to_paragraphs(text: str) -> List[str]:
    t = text.replace('\r\n', '\n')
    t = re.sub(r'\n{2,}', '\n\n', t)
    return [b.strip() for b in t.split('\n\n') if b.strip()]

def _is_heading(p: str) -> bool:
    if len(p) > 100: return False
    if re.match(r'^([A-Z][A-Za-z0-9 /\-]+):?\s*$', p): return True
    if re.match(r'^\s*(\d+\.)+\s+\S', p): return True
    if re.match(r'^[A-Z][A-Z\s]{4,}$', p.strip()): return True
    return False

def _build_profile(text: str, paragraphs: List[str]) -> DocumentProfileStats:
    words = text.split()
    headings = [p for p in paragraphs if _is_heading(p)]
    lists = [p for p in paragraphs if re.match(r'^\s*[-•*]\s+\S', p) or re.match(r'^\s*\d+\.\s', p) and not _is_heading(p)]
    return DocumentProfileStats(
        word_count=len(words),
        paragraph_count=len(paragraphs),
        heading_count=len(headings),
        list_count=len(lists)
    )

def _extract_semantic_entities(text: str) -> Dict[str, set]:
    entities = {
        "dates": set(),
        "numbers": set(),
        "percentages": set(),
        "monetary": set(),
    }
    
    # Dates
    for m in re.finditer(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b', text):
        entities["dates"].add(m.group(1))
    for m in re.finditer(r'\b([A-Z][a-z]+ \d{1,2},? \d{4})\b', text):
        entities["dates"].add(m.group(1))
        
    # Percentages
    for m in re.finditer(r'\b(\d+(?:\.\d+)?\s*%)\b', text):
        entities["percentages"].add(m.group(1))
        
    # Monetary
    for m in re.finditer(r'(\$[\d,]+(?:\.\d{2})?|\d+\s*(?:USD|EUR|GBP))', text):
        entities["monetary"].add(m.group(1))
        
    # Numbers (generic, > 0)
    for m in re.finditer(r'\b(\d+(?:,\d{3})*(?:\.\d+)?)\b', text):
        num_str = m.group(1)
        if num_str not in entities["dates"] and num_str not in [p.replace('%', '').strip() for p in entities["percentages"]]:
            # Simple heuristic
            if len(num_str) <= 6:
                entities["numbers"].add(num_str)
                
    return entities

def build_deterministic_diff(src_text: str, tgt_text: str) -> Dict[str, Any]:
    src_paragraphs = _to_paragraphs(src_text)
    tgt_paragraphs = _to_paragraphs(tgt_text)
    
    src_profile = _build_profile(src_text, src_paragraphs)
    tgt_profile = _build_profile(tgt_text, tgt_paragraphs)
    
    delta = {
        "word_count": tgt_profile.word_count - src_profile.word_count,
        "paragraph_count": tgt_profile.paragraph_count - src_profile.paragraph_count,
        "heading_count": tgt_profile.heading_count - src_profile.heading_count,
        "list_count": tgt_profile.list_count - src_profile.list_count,
    }
    
    matcher = difflib.SequenceMatcher(None, src_paragraphs, tgt_paragraphs)
    similarity = matcher.ratio() * 100
    
    ops = matcher.get_opcodes()
    
    structural_diffs = []
    semantic_signals = []
    
    src_headings = [p for p in src_paragraphs if _is_heading(p)]
    tgt_headings = [p for p in tgt_paragraphs if _is_heading(p)]
    
    for h in src_headings:
        if h not in tgt_headings:
            structural_diffs.append({"type": "Removed Heading", "value": h})
    for h in tgt_headings:
        if h not in src_headings:
            structural_diffs.append({"type": "Added Heading", "value": h})
            
    src_entities = _extract_semantic_entities(src_text)
    tgt_entities = _extract_semantic_entities(tgt_text)
    
    for cat in src_entities.keys():
        removed = src_entities[cat] - tgt_entities[cat]
        added = tgt_entities[cat] - src_entities[cat]
        if removed or added:
            semantic_signals.append({
                "category": cat,
                "removed": list(removed),
                "added": list(added)
            })

    # Build ledger
    ledger = []
    added_sections = 0
    removed_sections = 0
    modified_sections = 0
    
    for tag, i1, i2, j1, j2 in ops:
        if tag == 'equal': continue
        
        src_exc = "\n".join(src_paragraphs[i1:i2])
        tgt_exc = "\n".join(tgt_paragraphs[j1:j2])
        
        if tag == 'insert':
            added_sections += 1
            if len(tgt_exc.strip()) > 10:
                ledger.append({"type": "addition", "content": tgt_exc})
        elif tag == 'delete':
            removed_sections += 1
            if len(src_exc.strip()) > 10:
                ledger.append({"type": "removal", "content": src_exc})
        elif tag == 'replace':
            modified_sections += 1
            if len(src_exc.strip()) > 10 or len(tgt_exc.strip()) > 10:
                ledger.append({"type": "modification", "old": src_exc, "new": tgt_exc})

    return {
        "similarity": similarity,
        "src_profile": src_profile.model_dump(),
        "tgt_profile": tgt_profile.model_dump(),
        "delta": delta,
        "structural_diffs": structural_diffs,
        "semantic_signals": semantic_signals,
        "ledger": ledger[:20], # limit to avoid giant context
        "added_sections_count": added_sections,
        "removed_sections_count": removed_sections,
        "modified_sections_count": modified_sections,
    }

# ---------------------------------------------------------------------------
# Stage C & D - LLM Synthesis
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the Proxima Revision Intelligence Workbench.
You analyze the deterministic diff output of two documents and synthesize a highly structured 'Revision Report'.

CRITICAL RULES:
1. Explain WHAT changed and what it MEANS.
2. If similarity is 100%, state that there are no material changes.
3. Classify risks based on meaning shifts. E.g. a changed payment term is high risk; a formatting change is low.
4. Extract side-by-side evidence of the most critical changes (up to 5).
5. Output ONLY valid JSON matching this exact schema:

{
  "similarity_score": 95.5,
  "overall_change_level": "Minor" | "Moderate" | "Significant",
  "executive_summary": "1-2 sentence summary of the revision impact.",
  "change_snapshot": {
    "similarity_score": 95.5,
    "overall_change_level": "Minor",
    "added_sections_count": 0,
    "removed_sections_count": 0,
    "modified_sections_count": 0,
    "overall_risk": "Low" | "Medium" | "High",
    "confidence": "High"
  },
  "structural_changes": [{"change_type": "Heading Added", "heading": "Section 2", "description": ""}],
  "semantic_changes": [{"category": "Payment", "old_value": "30 days", "new_value": "15 days", "description": ""}],
  "reviewer_priorities": [{"title": "Review payment term", "severity": "High", "description": ""}],
  "risk_changes": [{"title": "Obligation increased", "severity": "Medium", "description": ""}],
  "evidence": [{"label": "Payment clause", "old_excerpt": "...", "new_excerpt": "..."}],
  "deterministic_signals": ["Changed Date", "Changed Percentage"],
  "document_profile": {
    "source": {"word_count": 0, "paragraph_count": 0, "heading_count": 0, "list_count": 0},
    "target": {"word_count": 0, "paragraph_count": 0, "heading_count": 0, "list_count": 0},
    "delta": {"word_count": 0, "paragraph_count": 0, "heading_count": 0, "list_count": 0}
  }
}

Use the deterministic diff provided. Do not hallucinate diffs that aren't there."""

async def _run_llm_synthesis(draft: dict) -> dict:
    from openai import AsyncOpenAI
    
    # We pass the deterministic draft to the LLM
    user_prompt = f"Deterministic Diff Data:\n{json.dumps(draft, indent=2)}\n\nGenerate the structured CompareResponseSchema JSON now."
    
    client = AsyncOpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    response = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        temperature=0.0,
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


class CompareAnalyzer:
    @classmethod
    async def analyze(cls, source_text: str, target_text: str) -> dict:
        source_text = source_text or ""
        target_text = target_text or ""
        
        # Stage A & B
        diff_data = build_deterministic_diff(source_text, target_text)
        
        # Determine signals
        signals = []
        for s in diff_data["semantic_signals"]:
            cat = s["category"].capitalize()
            signals.append(f"Changed {cat}")
            
        if diff_data["structural_diffs"]:
            signals.append("Structural Change")
            
        diff_data["signals_preview"] = signals
        
        # Stage C & D
        try:
            llm_result = await _run_llm_synthesis(diff_data)
        except Exception as e:
            # Fallback
            llm_result = cls._fallback_response(diff_data, str(e))
            
        # Ensure profile stats are strictly maintained
        llm_result["document_profile"] = {
            "source": diff_data["src_profile"],
            "target": diff_data["tgt_profile"],
            "delta": diff_data["delta"]
        }
        llm_result["similarity_score"] = round(diff_data["similarity"], 1)
        llm_result["change_snapshot"]["similarity_score"] = round(diff_data["similarity"], 1)
        
        # Ensure list fields are lists
        for field in ("structural_changes", "semantic_changes", "reviewer_priorities", "risk_changes", "evidence", "deterministic_signals"):
            if not isinstance(llm_result.get(field), list):
                llm_result[field] = []
                
        return llm_result

    @classmethod
    def _fallback_response(cls, diff_data: dict, error: str) -> dict:
        return {
            "similarity_score": round(diff_data["similarity"], 1),
            "overall_change_level": "Unknown",
            "executive_summary": f"LLM synthesis failed. Deterministic diff generated. ({error[:100]})",
            "change_snapshot": {
                "similarity_score": round(diff_data["similarity"], 1),
                "overall_change_level": "Unknown",
                "added_sections_count": diff_data["added_sections_count"],
                "removed_sections_count": diff_data["removed_sections_count"],
                "modified_sections_count": diff_data["modified_sections_count"],
                "overall_risk": "Unknown",
                "confidence": "Low"
            },
            "structural_changes": [],
            "semantic_changes": [],
            "reviewer_priorities": [],
            "risk_changes": [],
            "evidence": [],
            "deterministic_signals": diff_data["signals_preview"],
            "document_profile": {
                "source": diff_data["src_profile"],
                "target": diff_data["tgt_profile"],
                "delta": diff_data["delta"]
            }
        }
