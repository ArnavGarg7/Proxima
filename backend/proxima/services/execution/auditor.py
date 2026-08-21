from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
import structlog

from proxima.models.ai import AIRequest, RegisteredModel, ResponseGrounding

logger = structlog.get_logger()


def _estimate(prompt_content: str, response_content: str, model: RegisteredModel):
    """Local (estimated) token + cost calculation — never authoritative usage."""
    tokens_in = len(prompt_content or "") // 4
    tokens_out = len(response_content or "") // 4
    cost = (
        (tokens_in / 1_000_000.0) * model.cost_per_1m_input
        + (tokens_out / 1_000_000.0) * model.cost_per_1m_output
    )
    return tokens_in, tokens_out, cost


class AIAuditor:
    @classmethod
    async def log_request(
        cls,
        db: AsyncSession,
        user_id: Optional[UUID],
        document_id: Optional[UUID],
        model: RegisteredModel,
        task_class: str,
        prompt_content: str,
        response_content: str,
    ) -> Optional[UUID]:
        """
        Persist an estimated-usage AIRequest row (is_estimated=True) and return
        its request_id (or None if it could not be written). Only token counts +
        cost are stored — never prompt or response content.
        """
        if not user_id:
            logger.debug("auditor.skip_logging", reason="user_id is missing")
            return None

        try:
            tokens_in, tokens_out, cost = _estimate(prompt_content, response_content, model)
            request_log = AIRequest(
                user_id=user_id,
                document_id=document_id,
                model_id=model.model_id,
                task_class=task_class,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                computed_cost=cost,
                is_estimated=True,
            )
            db.add(request_log)
            await db.commit()
            logger.debug(
                "auditor.request_logged",
                user_id=str(user_id),
                model_id=model.model_id,
                task_class=task_class,
                estimated_tokens_in=tokens_in,
                estimated_tokens_out=tokens_out,
            )
            return request_log.request_id
        except Exception as db_err:
            await db.rollback()
            logger.error("auditor.database_write_failed", error=str(db_err))
            return None

    @classmethod
    def log_request_sync(
        cls,
        db: Session,
        user_id: Optional[UUID],
        document_id: Optional[UUID],
        model: RegisteredModel,
        task_class: str,
        prompt_content: str,
        response_content: str,
    ) -> Optional[UUID]:
        """Synchronous AIRequest audit for Celery workers (Stage 7D analysis)."""
        if not user_id:
            return None
        try:
            tokens_in, tokens_out, cost = _estimate(prompt_content, response_content, model)
            request_log = AIRequest(
                user_id=user_id,
                document_id=document_id,
                model_id=model.model_id,
                task_class=task_class,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                computed_cost=cost,
                is_estimated=True,
            )
            db.add(request_log)
            db.commit()
            return request_log.request_id
        except Exception as db_err:
            db.rollback()
            logger.error("auditor.sync_write_failed", error=str(db_err))
            return None

    @classmethod
    async def log_grounding(
        cls,
        db: AsyncSession,
        user_id: Optional[UUID],
        ai_request_id: Optional[UUID],
        document_id: Optional[UUID],
        model_id: Optional[str],
        task_class: str,
        grounding_result: Dict[str, Any],
        citations: List[Dict[str, Any]],
        latency_ms: int,
        success: bool,
    ) -> Optional[UUID]:
        """
        Persist a ResponseGrounding row. Stores citation PROVENANCE only (ref key,
        chunk, document, title, page) — never evidence snippets, prompts, or the
        model response. User-scoped.
        """
        if not user_id:
            return None
        try:
            provenance = [
                {
                    "ref_key": c.get("ref_key"),
                    "chunk_id": c.get("chunk_id"),
                    "document_id": c.get("document_id"),
                    "document_title": c.get("document_title"),
                    "page_number": c.get("page_number"),
                }
                for c in (citations or [])
            ]
            grounding_result = grounding_result or {}
            invalid_refs = grounding_result.get("invalid_references", []) or []
            row = ResponseGrounding(
                user_id=user_id,
                ai_request_id=ai_request_id,
                document_id=document_id,
                model_id=model_id,
                task_class=task_class,
                grounding_status=grounding_result.get("grounding_status", "unknown"),
                grounding_score=float(grounding_result.get("grounding_score", 0.0) or 0.0),
                citation_validity=float(grounding_result.get("citation_validity", 0.0) or 0.0),
                evidence_coverage=float(grounding_result.get("evidence_coverage", 0.0) or 0.0),
                citation_count=len(provenance),
                invalid_reference_count=len(invalid_refs),
                latency_ms=int(latency_ms or 0),
                success=success,
                citations=provenance,
            )
            db.add(row)
            await db.commit()
            return row.grounding_id
        except Exception as db_err:
            await db.rollback()
            logger.error("auditor.grounding_write_failed", error=str(db_err))
            return None
