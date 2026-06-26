"""
template_registry.py — Phase 4.20 Template Execution Layer

Canonical in-memory template registry for Proxima.
Templates are workflow launchers that route users into the correct workbench
with pre-seeded context. This registry is the single source of truth.
"""

from typing import Optional, Literal
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Template definition model
# ---------------------------------------------------------------------------

class TemplateDefinition(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    domain: Literal["clinical", "legal", "code", "general"]
    target_workbench: Literal["clinical", "legal", "code", "analyze"]
    launch_mode: Literal["document_required", "document_optional", "code_input"]
    badge_label: str
    icon: str                          # material-symbols-outlined icon name
    default_instructions: str
    default_analysis_mode: Optional[str] = None
    expected_domain_hint: Optional[str] = None
    active: bool = True


# ---------------------------------------------------------------------------
# Canonical template registry
# ---------------------------------------------------------------------------

TEMPLATE_REGISTRY: list[TemplateDefinition] = [

    TemplateDefinition(
        id="clinical_note_summary",
        slug="clinical-note-summary",
        name="Clinical Note Summary",
        description="Extract structured clinical entities from a patient note: chief complaint, assessment, medications, tests, plan items, and follow-up instructions.",
        domain="clinical",
        target_workbench="clinical",
        launch_mode="document_required",
        badge_label="Clinical",
        icon="medical_services",
        default_instructions=(
            "Analyze this clinical note and extract: chief complaint, history of presenting illness, "
            "assessment and diagnosis, current medications and therapies, lab or imaging results, "
            "plan and next steps, and any follow-up instructions. "
            "Preserve uncertainty language. Do not invent clinical information not present in the note."
        ),
        default_analysis_mode="clinical_extraction",
        expected_domain_hint="clinical note / patient summary / SOAP note / discharge summary / medical report",
    ),

    TemplateDefinition(
        id="contract_risk_audit",
        slug="contract-risk-audit",
        name="Contract Risk Audit",
        description="Analyze a contract for key obligations, payment terms, termination rights, indemnity, liability exposure, and missing clause coverage.",
        domain="legal",
        target_workbench="legal",
        launch_mode="document_required",
        badge_label="Legal",
        icon="gavel",
        default_instructions=(
            "Audit this contract and extract: contracting parties, effective date, term and duration, "
            "key obligations, payment terms and fee schedules, termination and renewal rights, "
            "indemnity and liability clauses, confidentiality obligations, governing law, "
            "and dispute resolution mechanisms. "
            "Flag any missing, ambiguous, or high-risk clauses. "
            "Do not provide legal advice. This is a document intelligence audit, not legal counsel."
        ),
        default_analysis_mode="contract_risk",
        expected_domain_hint="contract / NDA / MSA / agreement / SOW / legal document",
    ),

    TemplateDefinition(
        id="code_review_assistant",
        slug="code-review-assistant",
        name="Code Review Assistant",
        description="Review code for correctness, logic errors, maintainability, documentation gaps, and improvement opportunities.",
        domain="code",
        target_workbench="code",
        launch_mode="code_input",
        badge_label="Code",
        icon="code",
        default_instructions=(
            "Review this code for: correctness and logic errors, edge cases, maintainability issues, "
            "naming clarity, documentation gaps, performance concerns, and security risks if applicable. "
            "Explain what the code does, identify bugs or issues, and suggest targeted improvements."
        ),
        default_analysis_mode="review",
        expected_domain_hint=None,
    ),

    TemplateDefinition(
        id="general_document_qa",
        slug="general-document-qa",
        name="General Document QA",
        description="Summarize any document by extracting key entities, arguments, takeaways, risks, and action items.",
        domain="general",
        target_workbench="analyze",
        launch_mode="document_required",
        badge_label="General",
        icon="summarize",
        default_instructions=(
            "Summarize this document and extract: the main subject and purpose, "
            "key entities and arguments, important findings or conclusions, "
            "identified risks or concerns, and concrete action items or recommendations. "
            "Be concise and structured. Preserve uncertainty if present."
        ),
        default_analysis_mode=None,
        expected_domain_hint="general document / report / memo / analysis",
    ),

]

# ---------------------------------------------------------------------------
# Registry lookup helpers
# ---------------------------------------------------------------------------

def get_all_templates(active_only: bool = True) -> list[TemplateDefinition]:
    if active_only:
        return [t for t in TEMPLATE_REGISTRY if t.active]
    return list(TEMPLATE_REGISTRY)


def get_template_by_id(template_id: str) -> Optional[TemplateDefinition]:
    for t in TEMPLATE_REGISTRY:
        if t.id == template_id:
            return t
    return None


def get_template_by_slug(slug: str) -> Optional[TemplateDefinition]:
    for t in TEMPLATE_REGISTRY:
        if t.slug == slug:
            return t
    return None
