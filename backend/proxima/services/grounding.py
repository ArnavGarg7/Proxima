"""
Grounding and Citation Service.

Authoritatively resolves LLM references against a Proxima-controlled registry,
detects citation hallucinations, and computes evidence-grounding metrics.
"""

import re
import structlog
from typing import List, Dict, Any, Tuple

logger = structlog.get_logger()

class GroundingService:
    def build_context_package(self, chunks: List[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
        """
        Takes hybrid search chunks, injects numbered Ref tags, formats context,
        and constructs an authoritative reference registry.
        """
        if not chunks:
            return "No relevant context found.", {}

        context_parts = []
        registry = {}

        for index, chunk in enumerate(chunks):
            ref_num = index + 1
            ref_key = f"[Ref {ref_num}]"
            
            # Record in authoritative registry
            registry[ref_key] = chunk

            # Format block
            doc_title = chunk.get("document_title", "Untitled")
            page_num = chunk.get("page_number", 1)
            content = chunk.get("content", "").strip()

            context_parts.append(
                f"{ref_key}\n"
                f"Document: {doc_title}\n"
                f"Page: {page_num}\n"
                f"Evidence:\n{content}"
            )

        context_package = "\n\n".join(context_parts)
        return context_package, registry

    def process_citations(self, response_text: str, registry: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]], List[str]]:
        """
        Scans LLM response for [Ref X] tags, validates them against the registry,
        and maps them to resolved citations. Fabricated tags are replaced with unverified markers.
        """
        if not response_text:
            return "", [], []

        # Find all patterns like [Ref 1], [Ref 2], [Ref 12]
        ref_pattern = re.compile(r'\[Ref\s+(\d+)\]')
        matches = ref_pattern.findall(response_text)

        resolved_citations = []
        invalid_refs = []
        seen_keys = set()

        # Build list of matching keys
        for match in matches:
            ref_key = f"[Ref {match}]"
            if ref_key in seen_keys:
                continue
            seen_keys.add(ref_key)

            if ref_key in registry:
                chunk = registry[ref_key]
                content = chunk.get("content", "")
                snippet = content[:200] + ("..." if len(content) > 200 else "")
                
                resolved_citations.append({
                    "ref_key": ref_key,
                    "chunk_id": chunk.get("chunk_id"),
                    "document_id": chunk.get("document_id"),
                    "document_title": chunk.get("document_title", "Untitled"),
                    "page_number": chunk.get("page_number", 1),
                    "snippet": snippet
                })
            else:
                invalid_refs.append(ref_key)

        # Replace invalid references in the text to explicitly indicate they are unverified
        cleaned_text = response_text
        for inv_ref in invalid_refs:
            # Safely escape brackets for regex replacement
            escaped_ref = inv_ref.replace('[', r'\[').replace(']', r'\]')
            cleaned_text = re.sub(escaped_ref, "[Ref unverified]", cleaned_text)

        return cleaned_text, resolved_citations, invalid_refs

    def evaluate_grounding(
        self,
        response_text: str,
        registry: Dict[str, Any],
        citations: List[Dict[str, Any]],
        invalid_refs: List[str]
    ) -> Dict[str, Any]:
        """
        Calculates grounding metrics independent of QHE.
        """
        lower_resp = (response_text or "").lower()
        
        # Insufficient evidence disclaimers
        insufficient_markers = [
            "insufficient evidence",
            "not enough information",
            "could not be completed",
            "please try again later",
            "unauthorized to access"
        ]
        
        is_insufficient = any(marker in lower_resp for marker in insufficient_markers)
        evidence_available = len(registry) > 0

        # Calculation of validity ratio
        total_cited = len(citations) + len(invalid_refs)
        if total_cited > 0:
            citation_validity = len(citations) / total_cited
        else:
            citation_validity = 1.0 if not evidence_available else 0.0

        # Coverage ratio
        if evidence_available:
            evidence_coverage = len(citations) / len(registry)
        else:
            evidence_coverage = 0.0

        # Calculate grounding score (0 - 100)
        if not evidence_available:
            # If no context was retrieved, 100.0 if the LLM says insufficient evidence, else 0.0
            grounding_score = 100.0 if is_insufficient else 0.0
        else:
            grounding_score = 100.0
            
            # Deduct for citation hallucinations
            if invalid_refs:
                grounding_score -= 65.0
                
            # Deduct if no citations used when context was provided
            if len(citations) == 0:
                grounding_score -= 30.0
                
            # Bonus for coverage (up to 20 points)
            grounding_score += evidence_coverage * 20.0
            
            # Clamp grounding score
            grounding_score = max(0.0, min(100.0, grounding_score))

        # Classify status
        if is_insufficient:
            status = "insufficient_evidence"
        elif invalid_refs:
            status = "unverified"
        else:
            status = "grounded"

        return {
            "evidence_availability": evidence_available,
            "citation_validity": citation_validity,
            "evidence_coverage": evidence_coverage,
            "grounding_score": round(grounding_score, 1),
            "insufficient_evidence": is_insufficient,
            "invalid_references": invalid_refs,
            "grounding_status": status
        }
