"""
contract_analyzer.py — Phase 4.19 Contract / Legal Analyzer

Three-stage pipeline:
  Stage A: Deterministic legal extraction
  Stage B: Build structured draft object
  Stage C: Controlled LLM synthesis via Groq
"""

import re
import json
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------

class LegalSnapshot(BaseModel):
    contract_type: str
    top_risk: str
    top_obligation: str
    top_clause_gap: str

class LegalRiskFlag(BaseModel):
    title: str
    category: str
    severity: str
    description: str
    evidence_excerpt: Optional[str] = None

class LegalClauseCard(BaseModel):
    clause_type: str
    status: str          # present | partial | not_detected
    summary: str
    evidence_excerpt: Optional[str] = None

class LegalEvidenceCard(BaseModel):
    label: str
    summary: str
    evidence_excerpt: str

class LegalResponseSchema(BaseModel):
    document_id: str
    document_title: str
    document_domain_hint: dict
    extraction_confidence: int
    classification_summary: str

    contract_type: str
    parties_summary: str
    effective_date_summary: str
    term_or_duration_summary: str

    legal_snapshot: LegalSnapshot

    executive_summary: str

    key_obligations: list[str]
    payment_terms: list[str]
    termination_or_renewal_terms: list[str]

    clause_cards: list[LegalClauseCard]
    risk_flags: list[LegalRiskFlag]
    evidence_cards: list[LegalEvidenceCard]

    deterministic_signals: list[str]
    document_profile: dict


# ---------------------------------------------------------------------------
# Controlled vocabulary
# ---------------------------------------------------------------------------

CONTRACT_TYPE_MAP = {
    "service_agreement": "Service Agreement",
    "nda": "NDA",
    "employment_agreement": "Employment Agreement",
    "msa": "MSA",
    "statement_of_work": "Statement of Work",
    "vendor_agreement": "Vendor Agreement",
    "consulting_agreement": "Consulting Agreement",
    "lease_agreement": "Lease Agreement",
    "license_agreement": "License Agreement",
    "terms_and_conditions": "Terms & Conditions",
    "unknown": "Unknown / Not clearly identifiable",
}

CLAUSE_FAMILIES = [
    "parties", "effective_date", "term", "services_scope",
    "payment_terms", "confidentiality", "termination", "renewal",
    "indemnity", "liability", "governing_law", "dispute_resolution",
    "warranties", "ip_ownership", "assignment", "notice",
    "force_majeure", "data_protection", "non_compete", "non_solicit",
    "deliverables", "sla", "signature", "other",
]

CLAUSE_DISPLAY = {
    "parties": "Parties",
    "effective_date": "Effective Date",
    "term": "Term / Duration",
    "services_scope": "Services Scope",
    "payment_terms": "Payment Terms",
    "confidentiality": "Confidentiality",
    "termination": "Termination",
    "renewal": "Renewal",
    "indemnity": "Indemnity",
    "liability": "Limitation of Liability",
    "governing_law": "Governing Law",
    "dispute_resolution": "Dispute Resolution",
    "warranties": "Warranties / Representations",
    "ip_ownership": "IP Ownership",
    "assignment": "Assignment",
    "notice": "Notice",
    "force_majeure": "Force Majeure",
    "data_protection": "Data Protection / Privacy",
    "non_compete": "Non-Compete",
    "non_solicit": "Non-Solicitation",
    "deliverables": "Deliverables",
    "sla": "SLA",
    "signature": "Signature Block",
    "other": "Other Provisions",
}

RISK_CATEGORIES = {
    "missing_clause", "ambiguity", "payment_risk", "termination_risk",
    "liability_risk", "governing_law_missing", "signature_missing",
    "document_quality", "non_legal_input",
}


# ---------------------------------------------------------------------------
# Stage A helpers
# ---------------------------------------------------------------------------

def _clip(text: str, match: str, radius: int = 180) -> str:
    """Extract a clean evidence snippet around a match."""
    idx = text.lower().find(match.lower())
    if idx == -1:
        return ""
    start = max(0, idx - radius)
    end = min(len(text), idx + len(match) + radius)
    excerpt = text[start:end].strip()
    excerpt = re.sub(r'\s+', ' ', excerpt)
    if start > 0:
        excerpt = "…" + excerpt
    if end < len(text):
        excerpt = excerpt + "…"
    return excerpt[:400]


def build_document_profile(text: str) -> dict:
    lines = text.split('\n')
    paragraphs = [p for p in text.split('\n\n') if p.strip()]
    words = text.split()

    heading_pattern = re.compile(r'^([A-Z][A-Za-z0-9 /\-]+):?\s*$')
    numbered_pattern = re.compile(r'^\s*(\d+\.)+\s+\S')
    bullet_pattern = re.compile(r'^\s*[-•*]\s+\S')
    all_caps_pattern = re.compile(r'^[A-Z][A-Z\s]{4,}$')
    table_pattern = re.compile(r'\|.*\|')
    sig_pattern = re.compile(r'\b(signature|signed|executed by|authorized by|witness|notary)\b', re.I)
    party_def_pattern = re.compile(r'\b(hereinafter|referred to as|defined as|the "client"|the "vendor"|the "company"|the "employee")\b', re.I)

    headings = [l for l in lines if heading_pattern.match(l.strip()) and len(l.strip()) < 80]
    numbered = [l for l in lines if numbered_pattern.match(l)]
    bullets = [l for l in lines if bullet_pattern.match(l)]
    all_caps = [l for l in lines if all_caps_pattern.match(l.strip()) and len(l.strip()) > 4]
    tables = [l for l in lines if table_pattern.search(l)]

    return {
        "word_count": len(words),
        "line_count": len(lines),
        "paragraph_count": len(paragraphs),
        "heading_count": len(headings),
        "numbered_clause_count": len(numbered),
        "bullet_count": len(bullets),
        "all_caps_heading_count": len(all_caps),
        "table_like_line_count": len(tables),
        "has_many_numbered_sections": len(numbered) >= 5,
        "has_signature_language": bool(sig_pattern.search(text)),
        "has_party_definition_language": bool(party_def_pattern.search(text)),
    }


def detect_legal_domain_hint(text: str, profile: dict) -> dict:
    text_lower = text.lower()
    signals = []
    score = 0.0

    # High-weight legal terms
    high_terms = [
        ("agreement", 8), ("parties", 6), ("herein", 7), ("hereto", 7),
        ("whereas", 8), ("obligations", 5), ("indemnif", 7), ("liability", 6),
        ("confidentiality", 7), ("governing law", 9), ("jurisdiction", 7),
        ("arbitration", 8), ("termination", 6), ("effective date", 8),
        ("force majeure", 9), ("consideration", 6), ("warranties", 5),
        ("representations", 5), ("assignment", 5), ("notice period", 7),
        ("now, therefore", 10), ("in witness whereof", 10),
        ("this agreement", 9), ("either party", 7), ("shall pay", 7),
        ("shall maintain", 6), ("shall deliver", 6), ("shall notify", 6),
        ("governed by the laws", 9), ("payment terms", 7), ("invoice", 5),
        ("compensation", 5), ("contractor", 5), ("vendor", 4), ("licensee", 6),
        ("licensor", 6), ("non-disclosure", 8), ("confidential information", 8),
    ]

    for term, weight in high_terms:
        if term in text_lower:
            signals.append(f'Legal term detected: "{term}"')
            score += weight

    # Structural signals
    if profile["has_many_numbered_sections"]:
        signals.append("Numbered clause structure detected")
        score += 12
    if profile["has_signature_language"]:
        signals.append("Signature language detected")
        score += 10
    if profile["has_party_definition_language"]:
        signals.append("Party definition language detected")
        score += 12
    if profile["all_caps_heading_count"] >= 2:
        signals.append("Multiple all-caps clause headings detected")
        score += 8
    if re.search(r'\bshall\b', text_lower):
        signals.append('"Shall" obligation language detected')
        score += 8

    # Contract type candidates
    candidates = []
    if re.search(r'\bnon-disclosure\b|\bnda\b|\bconfidential information\b', text_lower):
        candidates.append("nda")
    if re.search(r'\bmaster service\b|\bmsa\b', text_lower):
        candidates.append("msa")
    if re.search(r'\bstatement of work\b|\bsow\b|\bdeliverable', text_lower):
        candidates.append("statement_of_work")
    if re.search(r'\bemployment\b|\bemployee\b|\bsalary\b|\bbenefits\b|\btermination of employment\b', text_lower):
        candidates.append("employment_agreement")
    if re.search(r'\blease\b|\brent\b|\bpremises\b|\btenant\b|\blandlord\b', text_lower):
        candidates.append("lease_agreement")
    if re.search(r'\blicense\b|\blicensor\b|\blicensee\b|\bsoftware license\b', text_lower):
        candidates.append("license_agreement")
    if re.search(r'\bterms and conditions\b|\bterms of service\b|\bterms of use\b', text_lower):
        candidates.append("terms_and_conditions")
    if re.search(r'\bconsulting\b|\bconsultant\b', text_lower):
        candidates.append("consulting_agreement")
    if re.search(r'\bvendor\b|\bsupplier\b|\bprocurement\b', text_lower):
        candidates.append("vendor_agreement")
    if re.search(r'\bservice agreement\b|\bservices agreement\b|\bprovide services\b', text_lower):
        candidates.append("service_agreement")

    # Normalize score to 0-100
    max_score = 100.0
    confidence = min(score / max_score * 100, 100.0)
    is_legal = confidence >= 25.0

    reason = ""
    if not is_legal:
        reason = "The document does not exhibit sufficient legal or contract-like language patterns to classify it as a legal document."
    elif confidence >= 70:
        reason = "Strong legal contract language and structural patterns detected."
    elif confidence >= 45:
        reason = "Moderate legal signals detected; document appears contract-related but may be a draft or partial agreement."
    else:
        reason = "Weak legal signals present; the document may contain some legal-adjacent language but is not clearly a contract."

    return {
        "is_legal_like": is_legal,
        "confidence": round(confidence, 1),
        "reason": reason,
        "top_signals": signals[:8],
        "candidate_document_types": candidates or ["unknown"],
    }


def _guess_contract_type(candidates: list) -> str:
    if not candidates:
        return "unknown"
    # Priority order
    priority = ["nda", "employment_agreement", "msa", "statement_of_work",
                "service_agreement", "license_agreement", "lease_agreement",
                "consulting_agreement", "vendor_agreement", "terms_and_conditions"]
    for p in priority:
        if p in candidates:
            return p
    return candidates[0]


def extract_legal_sections(text: str) -> list:
    lines = text.split('\n')
    sections = []

    clause_title_map = {
        r'parties|recitals': 'parties',
        r'effective date|commencement date': 'effective_date',
        r'term\b|duration\b|period\b': 'term',
        r'scope of service|services|deliverables|work': 'services_scope',
        r'payment|fees|compensation|invoice|pricing': 'payment_terms',
        r'confidential|non.disclosure|nda': 'confidentiality',
        r'terminat': 'termination',
        r'renew|extension': 'renewal',
        r'indemnif': 'indemnity',
        r'liabilit|limitation': 'liability',
        r'governing law|applicable law': 'governing_law',
        r'dispute|arbitration|mediation|jurisdiction': 'dispute_resolution',
        r'warrant|represent': 'warranties',
        r'intellectual property|ip\b|ownership|work product': 'ip_ownership',
        r'assignment|transfer': 'assignment',
        r'notice\b|notification': 'notice',
        r'force majeure|act of god': 'force_majeure',
        r'data protection|privacy|gdpr': 'data_protection',
        r'non.compet': 'non_compete',
        r'non.solicit': 'non_solicit',
        r'sla|service level': 'sla',
        r'signature|execution|witness|notary': 'signature',
    }

    current_section = None
    current_start = 0
    current_lines = []

    numbered_heading = re.compile(r'^\s*(\d+\.)+\s+([A-Za-z].{2,60})$')
    allcaps_heading = re.compile(r'^([A-Z][A-Z\s\-/]{4,60}):?\s*$')
    titled_heading = re.compile(r'^([A-Z][a-z][A-Za-z\s\-/]{3,60}):?\s*$')

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        m = numbered_heading.match(stripped) or allcaps_heading.match(stripped) or titled_heading.match(stripped)
        if m:
            # Save previous section
            if current_section:
                content = '\n'.join(current_lines).strip()
                if len(content) > 30:
                    sections.append({
                        "section_title": current_section[0],
                        "normalized_type": current_section[1],
                        "start_line": current_start,
                        "end_line": i - 1,
                        "content": content[:600],
                    })

            title = stripped
            norm = 'other'
            for pattern, ntype in clause_title_map.items():
                if re.search(pattern, title, re.I):
                    norm = ntype
                    break

            current_section = (title, norm)
            current_start = i
            current_lines = []
        elif current_section:
            current_lines.append(stripped)

    # Flush last section
    if current_section and current_lines:
        content = '\n'.join(current_lines).strip()
        if len(content) > 30:
            sections.append({
                "section_title": current_section[0],
                "normalized_type": current_section[1],
                "start_line": current_start,
                "end_line": len(lines) - 1,
                "content": content[:600],
            })

    return sections


def extract_legal_entities(text: str, sections: list) -> dict:
    entities = {
        "parties": [],
        "effective_dates": [],
        "term_mentions": [],
        "payment_mentions": [],
        "governing_law_mentions": [],
        "notice_mentions": [],
    }

    # Parties — look for 'X ("Client")' or 'X ("Vendor")' patterns
    party_pattern = re.compile(
        r'([A-Z][A-Za-z\s,\.]+(?:Inc\.|LLC|Ltd\.|Corp\.|GmbH|LLP)?)\s*\(?"?(Client|Vendor|Company|Employee|Employer|Consultant|Licensor|Licensee|Service Provider|Customer|Contractor|Supplier)"?\)', re.I
    )
    for m in party_pattern.finditer(text):
        name = m.group(1).strip().rstrip(',')
        role = m.group(2).strip()
        if len(name) > 2 and len(name) < 100:
            entry = f"{name} ({role})"
            if entry not in entities["parties"]:
                entities["parties"].append(entry)

    # Effective dates
    date_patterns = [
        re.compile(r'effective\s+(?:as\s+of\s+)?(?:date[:\s]+)?(\w+ \d{1,2},?\s*\d{4})', re.I),
        re.compile(r'effective\s+(?:as\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', re.I),
        re.compile(r'commencing\s+(?:on\s+)?(\w+ \d{1,2},?\s*\d{4})', re.I),
    ]
    for dp in date_patterns:
        for m in dp.finditer(text):
            val = m.group(1).strip()
            if val not in entities["effective_dates"]:
                entities["effective_dates"].append(val)

    # Term / duration
    term_pattern = re.compile(r'(?:term|duration|period)\s+of\s+(\d+\s+(?:month|year|week|day)s?)', re.I)
    for m in term_pattern.finditer(text):
        val = m.group(1).strip()
        if val not in entities["term_mentions"]:
            entities["term_mentions"].append(val)

    # Payment amounts
    pay_pattern = re.compile(r'\$[\d,]+(?:\.\d+)?|\d+\s+(?:USD|EUR|GBP|CAD|AUD)', re.I)
    for m in pay_pattern.finditer(text):
        val = m.group(0).strip()
        if val not in entities["payment_mentions"]:
            entities["payment_mentions"].append(val)
    entities["payment_mentions"] = entities["payment_mentions"][:8]

    # Governing law
    gov_pattern = re.compile(r'(?:laws?\s+of|governed\s+by\s+(?:the\s+laws?\s+of)?)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})', re.I)
    for m in gov_pattern.finditer(text):
        val = m.group(1).strip()
        if val not in entities["governing_law_mentions"]:
            entities["governing_law_mentions"].append(val)

    # Notice periods
    notice_pattern = re.compile(r'(\d+)\s+(business\s+)?days?\s+(?:written\s+)?notice', re.I)
    for m in notice_pattern.finditer(text):
        val = f"{m.group(1)} {m.group(2) or ''}days notice".strip()
        if val not in entities["notice_mentions"]:
            entities["notice_mentions"].append(val)

    return entities


def extract_clause_signals(text: str) -> dict:
    text_lower = text.lower()

    def _signal(keywords: list, weight_threshold: int = 1) -> dict:
        present = False
        confidence = 0.0
        evidence = []
        for kw, wt in keywords:
            if kw in text_lower:
                confidence += wt * 0.15
                present = True
                exc = _clip(text, kw, 120)
                if exc and exc not in evidence:
                    evidence.append(exc)
        confidence = min(confidence, 1.0)
        return {
            "present": present,
            "confidence": round(confidence, 2),
            "evidence": evidence[:2],
        }

    return {
        "payment_terms": _signal([
            ("payment", 3), ("invoice", 4), ("fee", 2), ("compensation", 3),
            ("shall pay", 5), ("due date", 4), ("net 30", 5), ("net 15", 5),
        ]),
        "confidentiality": _signal([
            ("confidential", 4), ("non-disclosure", 5), ("proprietary information", 5),
            ("confidential information", 5), ("disclose", 2),
        ]),
        "termination": _signal([
            ("termination", 5), ("terminate", 4), ("upon termination", 5),
            ("may terminate", 5), ("cause", 2), ("without cause", 4),
        ]),
        "renewal": _signal([
            ("renew", 4), ("renewal", 5), ("automatically renew", 6),
            ("auto-renew", 6), ("extension", 3),
        ]),
        "indemnity": _signal([
            ("indemnif", 5), ("hold harmless", 6), ("defend", 2),
            ("indemnification", 6),
        ]),
        "liability": _signal([
            ("limitation of liability", 7), ("liability", 4), ("in no event", 5),
            ("consequential damages", 6), ("aggregate liability", 6),
        ]),
        "governing_law": _signal([
            ("governing law", 7), ("governed by", 5), ("laws of", 4),
            ("jurisdiction", 5), ("applicable law", 5),
        ]),
        "dispute_resolution": _signal([
            ("dispute", 3), ("arbitration", 6), ("mediation", 5),
            ("binding arbitration", 7), ("adr", 4), ("court", 2),
        ]),
        "ip_ownership": _signal([
            ("intellectual property", 5), ("work product", 5), ("ip", 2),
            ("proprietary", 3), ("ownership", 3), ("assigns", 3),
        ]),
        "warranties": _signal([
            ("warrant", 4), ("warranty", 5), ("representation", 4),
            ("as-is", 5), ("merchantability", 6),
        ]),
        "force_majeure": _signal([
            ("force majeure", 8), ("act of god", 7), ("beyond reasonable control", 6),
        ]),
        "notice": _signal([
            ("notice", 3), ("notify", 3), ("written notice", 5),
            ("days notice", 5), ("notification", 4),
        ]),
        "assignment": _signal([
            ("assignment", 5), ("assign", 3), ("assignee", 5), ("transfer", 3),
        ]),
        "data_protection": _signal([
            ("data protection", 6), ("personal data", 5), ("gdpr", 7),
            ("privacy", 4), ("data processing", 5),
        ]),
    }


def extract_obligations(text: str, sections: list) -> list:
    obligation_patterns = [
        re.compile(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+shall\s+([^.!?\n]{20,150})', re.M),
        re.compile(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+must\s+([^.!?\n]{20,150})', re.M),
        re.compile(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+agrees\s+to\s+([^.!?\n]{20,150})', re.M),
        re.compile(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+required\s+to\s+([^.!?\n]{20,150})', re.M),
    ]

    seen = set()
    obligations = []

    for pattern in obligation_patterns:
        for m in pattern.finditer(text):
            party = m.group(1).strip()
            obligation_text = m.group(2).strip().rstrip('.,;')
            key = obligation_text[:50]
            if key in seen or len(obligations) >= 12:
                continue
            seen.add(key)

            category = "other"
            lower = obligation_text.lower()
            if any(k in lower for k in ["pay", "payment", "invoice", "fee"]):
                category = "payment"
            elif any(k in lower for k in ["deliver", "provide", "complete"]):
                category = "delivery"
            elif any(k in lower for k in ["confidential", "disclose", "secret"]):
                category = "confidentiality"
            elif any(k in lower for k in ["notify", "notice", "inform"]):
                category = "notice"

            obligations.append({
                "party": party if len(party) < 40 else None,
                "obligation": f"{party} shall {obligation_text}",
                "category": category,
                "evidence": _clip(text, m.group(0)[:40], 80),
            })

    return obligations


def detect_contract_risk_flags(text: str, profile: dict, sections: list,
                                clause_signals: dict, entities: dict,
                                domain_hint: dict) -> list:
    flags = []
    text_lower = text.lower()
    section_types = {s["normalized_type"] for s in sections}

    # Non-legal document
    if not domain_hint["is_legal_like"]:
        flags.append({
            "title": "Document does not appear to be a legal contract",
            "category": "non_legal_input",
            "severity": "high",
            "description": "The selected document lacks strong legal or contract-like language patterns. Legal extraction results will be limited.",
            "evidence_excerpt": domain_hint["reason"],
        })
        return flags  # Early exit for non-legal docs

    # Missing governing law
    if not clause_signals["governing_law"]["present"]:
        flags.append({
            "title": "No governing law clause detected",
            "category": "governing_law_missing",
            "severity": "medium",
            "description": "The document appears contract-like but no governing law or jurisdiction language was confidently detected. This may create legal uncertainty.",
            "evidence_excerpt": None,
        })

    # Missing termination
    if not clause_signals["termination"]["present"]:
        flags.append({
            "title": "No termination clause detected",
            "category": "missing_clause",
            "severity": "medium",
            "description": "No clear termination language was found. Without explicit termination rights, parties may face uncertainty about ending the agreement.",
            "evidence_excerpt": None,
        })

    # Signature missing in what looks like a final contract
    if not profile["has_signature_language"] and domain_hint["confidence"] >= 50:
        flags.append({
            "title": "Signature block not detected",
            "category": "signature_missing",
            "severity": "medium",
            "description": "No signature block or execution language was found. The document may be a draft or template, not a fully executed agreement.",
            "evidence_excerpt": None,
        })

    # Missing payment in a service-like contract
    if not clause_signals["payment_terms"]["present"]:
        service_types = {"service_agreement", "consulting_agreement", "statement_of_work", "vendor_agreement", "msa"}
        if service_types.intersection(set(domain_hint.get("candidate_document_types", []))):
            flags.append({
                "title": "No payment terms detected",
                "category": "payment_risk",
                "severity": "high",
                "description": "This appears to be a service-type agreement, but no payment, fee, or compensation language was detected. This is a significant gap.",
                "evidence_excerpt": None,
            })

    # No liability limitation
    if not clause_signals["liability"]["present"]:
        flags.append({
            "title": "No limitation of liability clause detected",
            "category": "liability_risk",
            "severity": "medium",
            "description": "No limitation of liability language was found. Without this, parties may face unlimited exposure.",
            "evidence_excerpt": None,
        })

    # Placeholder language
    placeholder_pattern = re.compile(r'\[(?:DATE|PARTY NAME|INSERT|TBD|TO BE DETERMINED|YOUR NAME)\]', re.I)
    if placeholder_pattern.search(text):
        excerpt = _clip(text, "[", 80)
        flags.append({
            "title": "Placeholder language detected",
            "category": "document_quality",
            "severity": "high",
            "description": "Unfilled placeholders such as [DATE] or [PARTY NAME] were found. This document may be an incomplete template.",
            "evidence_excerpt": excerpt,
        })

    # Very short document
    if profile["word_count"] < 100:
        flags.append({
            "title": "Very short document",
            "category": "document_quality",
            "severity": "high",
            "description": "The document is extremely brief and likely missing substantial legal clauses.",
            "evidence_excerpt": None,
        })

    # Ambiguous language
    ambiguous = ["may or may not", "at the discretion", "from time to time", "as agreed"]
    for term in ambiguous:
        if term in text_lower:
            flags.append({
                "title": f'Ambiguous contract language: "{term}"',
                "category": "ambiguity",
                "severity": "low",
                "description": f'The phrase "{term}" introduces interpretive flexibility which may cause disputes.',
                "evidence_excerpt": _clip(text, term, 100),
            })
            break

    return flags[:10]


# ---------------------------------------------------------------------------
# Stage B — Build draft
# ---------------------------------------------------------------------------

def _build_draft(text: str, profile: dict, domain_hint: dict,
                 sections: list, entities: dict, clause_signals: dict,
                 obligations: list, risk_flags: list) -> dict:
    type_key = _guess_contract_type(domain_hint.get("candidate_document_types", []))

    return {
        "document_profile": profile,
        "document_domain_hint": domain_hint,
        "candidate_contract_type": type_key,
        "parties": entities["parties"],
        "effective_dates": entities["effective_dates"],
        "term_summary_candidates": entities["term_mentions"],
        "payment_mentions": entities["payment_mentions"],
        "governing_law_mentions": entities["governing_law_mentions"],
        "notice_mentions": entities["notice_mentions"],
        "section_map": [
            {"section_title": s["section_title"], "normalized_type": s["normalized_type"]}
            for s in sections
        ],
        "clause_signals": {
            k: {"present": v["present"], "confidence": v["confidence"]}
            for k, v in clause_signals.items()
        },
        "obligations": obligations,
        "risk_flags": risk_flags,
        "key_evidence_pool": [
            {"clause": k, "excerpt": v["evidence"][0]}
            for k, v in clause_signals.items()
            if v["present"] and v["evidence"]
        ][:10],
    }


# ---------------------------------------------------------------------------
# Stage C — LLM synthesis
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the Proxima Contract Analyzer backend service.
Your job is to synthesize a structured legal intelligence report from deterministic extraction results.

CRITICAL RULES:
1. DO NOT invent clauses, parties, dates, or obligations not supported by the document text.
2. DO NOT claim the contract is legally enforceable, valid, or compliant.
3. DO NOT provide legal advice. This is a document intelligence tool, not legal counsel.
4. If information is missing, use conservative fallbacks like "Not clearly identifiable" or empty arrays.
5. Preserve uncertainty language. If something is partial, say so.
6. If the document is NOT legal-like, clearly say so and provide minimal clause cards.
7. Clause card status must be: "present", "partial", or "not_detected".
8. Risk flag categories must be one of: missing_clause, ambiguity, payment_risk, termination_risk, liability_risk, governing_law_missing, signature_missing, document_quality, non_legal_input.
9. IMPORTANT: key_obligations, payment_terms, termination_or_renewal_terms, and deterministic_signals MUST be arrays of PLAIN STRINGS only — NOT objects. Each item is a single human-readable sentence.
   CORRECT: "key_obligations": ["Client shall pay within 30 days of invoice."]
   WRONG:   "key_obligations": [{"party": "Client", "obligation": "pay"}]

Output ONLY valid JSON matching this exact schema — no extra fields, no markdown:
{
  "document_domain_hint": {"is_legal_like": true, "confidence": 75.0, "reason": ""},
  "extraction_confidence": 70,
  "classification_summary": "",
  "contract_type": "",
  "parties_summary": "",
  "effective_date_summary": "",
  "term_or_duration_summary": "",
  "legal_snapshot": {
    "contract_type": "",
    "top_risk": "",
    "top_obligation": "",
    "top_clause_gap": ""
  },
  "executive_summary": "",
  "key_obligations": ["plain string obligation sentence"],
  "payment_terms": ["plain string payment term sentence"],
  "termination_or_renewal_terms": ["plain string termination sentence"],
  "clause_cards": [{"clause_type": "", "status": "present", "summary": "", "evidence_excerpt": null}],
  "risk_flags": [{"title": "", "category": "", "severity": "", "description": "", "evidence_excerpt": null}],
  "evidence_cards": [{"label": "", "summary": "", "evidence_excerpt": ""}],
  "deterministic_signals": ["plain string signal"],
  "document_profile": {}
}
"""


async def _run_llm_synthesis(text: str, draft: dict, metadata: dict) -> dict:
    import os
    from openai import AsyncOpenAI

    excerpt = text[:5000]
    user_prompt = f"""Document Metadata: {json.dumps(metadata or {})}

Deterministic Draft:
{json.dumps(draft, indent=2)}

--- DOCUMENT TEXT (first 5000 chars) ---
{excerpt}
--- END ---

Generate the structured LegalResponseSchema JSON now. Remember: conservative, evidence-backed, no hallucinated clauses."""

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
    result = json.loads(raw)
    # Post-process: normalize string-array fields in case LLM returned objects
    result = _normalize_llm_result(result)
    return result


def _coerce_to_str(item) -> str:
    """Coerce a list item to a plain string. Handles LLM returning objects instead of strings."""
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        # obligation objects: {party, obligation, category, evidence}
        for key in ("obligation", "term", "description", "text", "summary", "label"):
            if isinstance(item.get(key), str):
                return item[key]
        # fallback: join all string values
        return " — ".join(v for v in item.values() if isinstance(v, str))
    return str(item)


def _normalize_llm_result(result: dict) -> dict:
    """Normalize string-array fields so they always contain strings, never objects."""
    for field in ("key_obligations", "payment_terms", "termination_or_renewal_terms", "deterministic_signals"):
        raw = result.get(field)
        if isinstance(raw, list):
            result[field] = [_coerce_to_str(item) for item in raw if item is not None]
        else:
            result[field] = []
    return result


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

class ContractAnalyzer:

    @classmethod
    async def analyze(cls, db: AsyncSession, document_text: str, metadata: dict = None) -> dict:
        text = document_text or ""
        meta = metadata or {}

        # Stage A
        profile = build_document_profile(text)
        domain_hint = detect_legal_domain_hint(text, profile)
        sections = extract_legal_sections(text)
        entities = extract_legal_entities(text, sections)
        clause_signals = extract_clause_signals(text)
        obligations = extract_obligations(text, sections)
        risk_flags = detect_contract_risk_flags(
            text, profile, sections, clause_signals, entities, domain_hint
        )

        # Stage B
        draft = _build_draft(
            text, profile, domain_hint, sections,
            entities, clause_signals, obligations, risk_flags
        )

        # Stage C
        try:
            llm_result = await _run_llm_synthesis(text, draft, meta)
        except Exception as e:
            # Graceful fallback if LLM fails
            llm_result = _build_fallback_response(draft, meta, str(e))

        # Inject guaranteed fields
        llm_result["document_id"] = meta.get("document_id", "unknown")
        llm_result["document_title"] = meta.get("filename", "Legal Document")

        # Ensure document_profile always present from deterministic pass
        if not llm_result.get("document_profile") or not llm_result["document_profile"].get("word_count"):
            llm_result["document_profile"] = {
                "word_count": profile["word_count"],
                "line_count": profile["line_count"],
                "paragraph_count": profile["paragraph_count"],
                "heading_count": profile["heading_count"],
                "numbered_clauses": profile["numbered_clause_count"],
            }

        # Ensure deterministic_signals always present
        if not llm_result.get("deterministic_signals"):
            llm_result["deterministic_signals"] = domain_hint.get("top_signals", [])

        return llm_result


def _build_fallback_response(draft: dict, meta: dict, error: str) -> dict:
    """Minimal valid response when LLM fails."""
    dh = draft["document_domain_hint"]
    profile = draft["document_profile"]
    return {
        "document_domain_hint": dh,
        "extraction_confidence": int(dh["confidence"]),
        "classification_summary": f"LLM synthesis failed: {error[:120]}. Deterministic extraction only.",
        "contract_type": CONTRACT_TYPE_MAP.get(draft["candidate_contract_type"], "Unknown"),
        "parties_summary": ", ".join(draft["parties"]) if draft["parties"] else "Not clearly identifiable",
        "effective_date_summary": ", ".join(draft["effective_dates"]) if draft["effective_dates"] else "Not clearly identifiable",
        "term_or_duration_summary": ", ".join(draft["term_summary_candidates"]) if draft["term_summary_candidates"] else "Not clearly identifiable",
        "legal_snapshot": {
            "contract_type": CONTRACT_TYPE_MAP.get(draft["candidate_contract_type"], "Unknown"),
            "top_risk": draft["risk_flags"][0]["title"] if draft["risk_flags"] else "None detected",
            "top_obligation": draft["obligations"][0]["obligation"][:80] if draft["obligations"] else "None detected",
            "top_clause_gap": "LLM synthesis unavailable",
        },
        "executive_summary": "LLM synthesis was unavailable. The deterministic extraction has been returned.",
        "key_obligations": [o["obligation"][:100] for o in draft["obligations"][:5]],
        "payment_terms": [],
        "termination_or_renewal_terms": [],
        "clause_cards": [],
        "risk_flags": [
            {
                "title": r["title"],
                "category": r["category"],
                "severity": r["severity"],
                "description": r["description"],
                "evidence_excerpt": r.get("evidence_excerpt"),
            }
            for r in draft["risk_flags"]
        ],
        "evidence_cards": [],
        "deterministic_signals": draft["document_domain_hint"].get("top_signals", []),
        "document_profile": {
            "word_count": profile["word_count"],
            "line_count": profile["line_count"],
            "paragraph_count": profile["paragraph_count"],
            "heading_count": profile["heading_count"],
            "numbered_clauses": profile["numbered_clause_count"],
        },
    }
