"""
templates_router.py — Phase 4.20 Template Execution Layer

Replaces the old read-only DB template list with a proper registry-backed
API surface including GET /api/templates, GET /api/templates/{id}, and
POST /api/templates/launch.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from proxima.database import get_db
from proxima.models.core import User, Document
from proxima.middleware.auth_middleware import get_current_user
from proxima.services.template_registry import (
    get_all_templates,
    get_template_by_id,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TemplateListItem(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    domain: str
    target_workbench: str
    launch_mode: str
    badge_label: str
    icon: str
    default_instructions: str
    expected_domain_hint: Optional[str] = None


class TemplateLaunchRequest(BaseModel):
    template_id: str
    document_id: Optional[str] = None


class TemplateLaunchPayload(BaseModel):
    template_id: str
    template_name: str
    template_domain: str
    target_workbench: str
    launch_mode: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    default_instructions: str
    default_analysis_mode: Optional[str] = None
    expected_domain_hint: Optional[str] = None


# ---------------------------------------------------------------------------
# GET /api/templates — list all active templates
# ---------------------------------------------------------------------------

@router.get("/")
async def list_templates(
    current_user: User = Depends(get_current_user),
):
    """Return all active templates from the registry."""
    templates = get_all_templates(active_only=True)
    return [
        TemplateListItem(
            id=t.id,
            slug=t.slug,
            name=t.name,
            description=t.description,
            domain=t.domain,
            target_workbench=t.target_workbench,
            launch_mode=t.launch_mode,
            badge_label=t.badge_label,
            icon=t.icon,
            default_instructions=t.default_instructions,
            expected_domain_hint=t.expected_domain_hint,
        )
        for t in templates
    ]


# ---------------------------------------------------------------------------
# GET /api/templates/{template_id} — full template definition
# ---------------------------------------------------------------------------

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return full template definition including launch metadata."""
    template = get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")
    return TemplateListItem(
        id=template.id,
        slug=template.slug,
        name=template.name,
        description=template.description,
        domain=template.domain,
        target_workbench=template.target_workbench,
        launch_mode=template.launch_mode,
        badge_label=template.badge_label,
        icon=template.icon,
        default_instructions=template.default_instructions,
        expected_domain_hint=template.expected_domain_hint,
    )


# ---------------------------------------------------------------------------
# POST /api/templates/launch — validate + return launch payload
# ---------------------------------------------------------------------------

@router.post("/launch")
async def launch_template(
    payload: TemplateLaunchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TemplateLaunchPayload:
    """
    Validate a template launch request and return a normalized TemplateLaunchPayload
    that the frontend uses to navigate into the correct workbench with seeded context.
    """
    # 1. Look up the template
    template = get_template_by_id(payload.template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{payload.template_id}' not found.")

    # 2. Validate document access if a document_id was provided
    document_name: Optional[str] = None
    document_id: Optional[str] = None

    if payload.document_id:
        try:
            doc_uuid = uuid.UUID(payload.document_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid document_id format.")

        doc = await db.get(Document, doc_uuid)
        if not doc or doc.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this document.")

        document_id = str(doc.document_id)
        document_name = doc.title

    # 3. Enforce document_required constraint
    if template.launch_mode == "document_required" and not document_id:
        raise HTTPException(
            status_code=400,
            detail=f"Template '{template.name}' requires a document to be selected before launch."
        )

    # 4. Return normalized launch payload
    return TemplateLaunchPayload(
        template_id=template.id,
        template_name=template.name,
        template_domain=template.domain,
        target_workbench=template.target_workbench,
        launch_mode=template.launch_mode,
        document_id=document_id,
        document_name=document_name,
        default_instructions=template.default_instructions,
        default_analysis_mode=template.default_analysis_mode,
        expected_domain_hint=template.expected_domain_hint,
    )
