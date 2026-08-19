"""
Embedding Service.

Responsible for generating vector embeddings for text blocks using the default registered model.
Decoupled to facilitate future backgrounding via Celery (Stage 7C).
"""

import structlog
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.services.model_registry import model_registry

logger = structlog.get_logger()

async def generate_chunk_embedding(db: AsyncSession, text: str) -> Optional[List[float]]:
    """
    Generates a vector embedding for the given text using the default active embedding model.
    Returns None if generation fails or is not supported.
    """
    if not text or not text.strip():
        return None

    try:
        # Retrieve default active embedding model from DB
        emb_model = await model_registry.get_default_embedding(db)
        if not emb_model:
            logger.warning("embedding.generate.no_model_found")
            return None

        # Delegate to model registry to generate vector
        vector = await model_registry.get_embedding(emb_model, text)
        return vector
    except Exception as e:
        logger.error(
            "embedding.generate.failed",
            error=str(e),
            text_preview=text[:100]
        )
        return None
