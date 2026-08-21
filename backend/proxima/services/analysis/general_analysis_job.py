"""
Durable general-document analysis (Stage 7D).

Runs synchronously inside a Celery worker. Small documents take a single
structured pass (fast path); large documents use a chunk-batch map-reduce so a
document is never dumped wholesale into one LLM prompt. Produces the existing
GeneralAnalysisResult schema, unchanged, so the public contract is preserved.
"""

import math
import re
from typing import List

import structlog
from pydantic import BaseModel
from sqlalchemy.orm import Session

from proxima.schemas.general_analysis import GeneralAnalysisResult, GeneralAnalysisPartial
from proxima.services.execution.sync_engine import (
    execute_structured_sync,
    TransientAnalysisError,
    TerminalAnalysisError,
)

logger = structlog.get_logger()

# Bounds that keep any single LLM prompt from receiving an unbounded document.
SINGLE_PASS_CHARS = 24_000     # ~6k words → single structured pass
BATCH_CHARS = 16_000           # ~4k words per map batch

# Caps for the reduced result so the final synthesis stays bounded too.
_LIST_CAPS = {
    "takeaways": 8, "topics": 8, "entities": 25, "dates": 15,
    "numbers": 15, "risks": 10, "actions": 10,
}

MAP_SYSTEM_PROMPT = """You are Proxima's General Intelligence Engine analyzing ONE SECTION of a larger document.
Extract structured insights from ONLY the section text provided.
Output strictly JSON matching the GeneralAnalysisPartial schema.
Every takeaway, topic, date, number, risk, and action MUST include an `evidence` array with exact quotes from THIS section.
executive_summary: 1-2 sentences summarizing THIS section only.
Do NOT hallucinate. If a field has no matches, return an empty array."""

FULL_SYSTEM_PROMPT = """You are Proxima's General Intelligence Engine.
Analyze the provided document text and extract structured insights.
Output strictly JSON matching the GeneralAnalysisResult schema.
Every takeaway, topic, date, number, risk, and action MUST include an `evidence` array with exact quotes.
Do NOT hallucinate. If a section has no matches, return an empty array."""

REDUCE_SYSTEM_PROMPT = """You are Proxima's General Intelligence Engine performing final synthesis.
You are given short section summaries of one document. Produce a single coherent
executive summary (2-3 paragraphs) of the WHOLE document. Output strictly JSON: {"executive_summary": "..."}."""


class _SummaryOnly(BaseModel):
    executive_summary: str = ""


def _deterministic_signals(full_text: str, word_count: int) -> List[str]:
    signals = []
    if word_count > 10000:
        signals.append("Lengthy Document")
    if re.search(r'\b(confidential|proprietary|secret)\b', full_text, re.IGNORECASE):
        signals.append("Contains Confidentiality Markers")
    if re.search(r'\b(action item|next step|todo|to-do)\b', full_text, re.IGNORECASE):
        signals.append("Contains Action Items")
    return signals


def _detect_language(full_text: str) -> str:
    try:
        from langdetect import detect
        return detect(full_text[:1000])
    except Exception:
        return "en"


def _fallback_result(word_count: int, reading_time: int, language: str, signals: List[str]) -> dict:
    return {
        "executive_summary": "AI analysis could not be completed. Please try again later or check system status.",
        "takeaways": [], "topics": [], "entities": [], "dates": [], "numbers": [],
        "risks": [{"level": "High", "description": "AI Pipeline Unavailable", "evidence": []}],
        "actions": [],
        "metadata": {"reading_time_minutes": reading_time, "word_count": word_count, "language": language},
        "confidence": 0,
        "signals": signals + ["Fallback Mode"],
    }


def _batch_chunks(chunks: List[str]) -> List[str]:
    """Group ordered chunk texts into bounded map batches."""
    batches: List[str] = []
    current: List[str] = []
    size = 0
    for c in chunks:
        c = c or ""
        if size + len(c) > BATCH_CHARS and current:
            batches.append("\n\n".join(current))
            current, size = [], 0
        current.append(c)
        size += len(c)
    if current:
        batches.append("\n\n".join(current))
    return batches


def _merge_partials(partials: List[GeneralAnalysisPartial]) -> dict:
    merged = {k: [] for k in ("takeaways", "topics", "entities", "dates", "numbers", "risks", "actions")}
    seen = {k: set() for k in merged}
    for p in partials:
        for field in merged:
            for item in getattr(p, field, []) or []:
                d = item.model_dump()
                # Dedup on the most identifying field of each item type.
                key = str(d.get("point") or d.get("name") or d.get("date")
                          or d.get("value") or d.get("description") or d.get("action") or d)
                if key in seen[field]:
                    continue
                seen[field].add(key)
                merged[field].append(d)
    for field, cap in _LIST_CAPS.items():
        merged[field] = merged[field][:cap]
    return merged


def run_general_analysis_sync(db: Session, chunk_texts: List[str], metadata: dict) -> dict:
    """
    Analyze a document's ordered chunk texts, returning a GeneralAnalysisResult dict.
    Small docs → single pass; large docs → map-reduce. On terminal failure returns
    a deterministic fallback; transient failures propagate (Celery retries).
    """
    full_text = "\n\n".join(t for t in chunk_texts if t)
    word_count = len(full_text.split())
    reading_time = max(1, math.ceil(word_count / 250))
    language = _detect_language(full_text)
    signals = _deterministic_signals(full_text, word_count)
    user_id = metadata.get("user_id")
    document_id = metadata.get("document_id")
    title = metadata.get("title", "Unknown")

    # ── Small document: single structured pass ──────────────────────────────
    if len(full_text) <= SINGLE_PASS_CHARS:
        try:
            validated, _model_id, _lat = execute_structured_sync(
                db,
                task_class="general_analysis",
                system_prompt=FULL_SYSTEM_PROMPT,
                user_message=f"DOCUMENT METADATA:\nTitle: {title}\nWord Count: {word_count}\n\nDOCUMENT TEXT:\n{full_text}",
                schema=GeneralAnalysisResult,
                user_id=user_id,
                document_id=document_id,
            )
        except TransientAnalysisError:
            raise
        except TerminalAnalysisError:
            return _fallback_result(word_count, reading_time, language, signals)

        result = validated.model_dump()
        result["metadata"] = {"reading_time_minutes": reading_time, "word_count": word_count, "language": language}
        result["signals"] = list(set((result.get("signals") or []) + signals))
        return result

    # ── Large document: map-reduce ──────────────────────────────────────────
    batches = _batch_chunks(chunk_texts)
    partials: List[GeneralAnalysisPartial] = []
    confidences: List[int] = []
    try:
        for i, batch in enumerate(batches):
            validated, _m, _l = execute_structured_sync(
                db,
                task_class="general_analysis_map",
                system_prompt=MAP_SYSTEM_PROMPT,
                user_message=f"SECTION {i + 1} of {len(batches)} — Document: {title}\n\nSECTION TEXT:\n{batch}",
                schema=GeneralAnalysisPartial,
                user_id=user_id,
                document_id=document_id,
            )
            partials.append(validated)
            confidences.append(int(validated.confidence or 0))
    except TransientAnalysisError:
        raise
    except TerminalAnalysisError:
        return _fallback_result(word_count, reading_time, language, signals)

    merged = _merge_partials(partials)

    # Bounded reduce for the executive summary (section summaries only).
    section_summaries = "\n".join(
        f"- Section {i + 1}: {p.executive_summary}" for i, p in enumerate(partials) if p.executive_summary
    )[:12_000]
    try:
        summary_obj, _m, _l = execute_structured_sync(
            db,
            task_class="general_analysis_reduce",
            system_prompt=REDUCE_SYSTEM_PROMPT,
            user_message=f"Document: {title}\n\nSECTION SUMMARIES:\n{section_summaries}",
            schema=_SummaryOnly,
            user_id=user_id,
            document_id=document_id,
        )
        executive_summary = summary_obj.executive_summary or section_summaries
    except TransientAnalysisError:
        raise
    except TerminalAnalysisError:
        executive_summary = " ".join(p.executive_summary for p in partials if p.executive_summary)[:4000]

    avg_conf = int(sum(confidences) / len(confidences)) if confidences else 0
    return {
        "executive_summary": executive_summary,
        **merged,
        "metadata": {"reading_time_minutes": reading_time, "word_count": word_count, "language": language},
        "confidence": avg_conf,
        "signals": list(set(signals + ["Map-Reduce Mode"])),
    }
