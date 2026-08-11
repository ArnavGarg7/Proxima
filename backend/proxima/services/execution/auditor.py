from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from proxima.models.ai import AIRequest, RegisteredModel

logger = structlog.get_logger()

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
    ) -> None:
        """
        Decorated logger that calculates estimated token counts and costs,
        persisting them to the ai_requests table with is_estimated = True.
        """
        # If user_id is missing, we cannot log due to non-null database constraint.
        if not user_id:
            logger.debug("auditor.skip_logging", reason="user_id is missing")
            return

        try:
            # Estimate token counts locally
            # Never present locally estimated token counts or costs as authoritative provider usage.
            estimated_tokens_in = len(prompt_content) // 4
            estimated_tokens_out = len(response_content) // 4

            estimated_cost = (
                (estimated_tokens_in / 1_000_000.0) * model.cost_per_1m_input
                + (estimated_tokens_out / 1_000_000.0) * model.cost_per_1m_output
            )

            request_log = AIRequest(
                user_id=user_id,
                document_id=document_id,
                model_id=model.model_id,
                task_class=task_class,
                tokens_input=estimated_tokens_in,
                tokens_output=estimated_tokens_out,
                computed_cost=estimated_cost,
                is_estimated=True
            )

            db.add(request_log)
            await db.commit()

            logger.debug(
                "auditor.request_logged",
                user_id=str(user_id),
                document_id=str(document_id) if document_id else None,
                model_id=model.model_id,
                estimated_tokens_in=estimated_tokens_in,
                estimated_tokens_out=estimated_tokens_out,
                estimated_cost=estimated_cost
            )
        except Exception as db_err:
            # Prevent database/auditing failures from blocking core completion flows.
            await db.rollback()
            logger.error("auditor.database_write_failed", error=str(db_err))
