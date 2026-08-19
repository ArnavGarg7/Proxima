"""
Backfill Service.

Provides helper logic to populate missing vector embeddings for pre-existing document chunks.
"""

import structlog
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.models.core import DocumentChunk
from proxima.services.embedding import generate_chunk_embedding
from proxima.services.model_registry import model_registry

logger = structlog.get_logger()

async def backfill_historical_embeddings(db: AsyncSession, batch_size: int = 50) -> int:
    """
    Backfills missing embeddings for historical document chunks in batches.
    Returns the total number of chunks successfully backfilled.
    """
    # 1. Fetch default embedding model details
    try:
        emb_model = await model_registry.get_default_embedding(db)
    except Exception as e:
        logger.error("backfill.failed_to_fetch_default_model", error=str(e))
        return 0

    if not emb_model:
        logger.warning("backfill.no_active_embedding_model")
        return 0

    backfilled_count = 0
    
    while True:
        # Query next batch of chunks missing embeddings
        stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.embedding == None)
            .limit(batch_size)
        )
        result = await db.execute(stmt)
        chunks = result.scalars().all()
        
        if not chunks:
            break
            
        logger.info("backfill.batch_start", count=len(chunks))
        
        for chunk in chunks:
            vector = await generate_chunk_embedding(db, chunk.content)
            if vector:
                chunk.embedding = vector
                chunk.embedding_model = emb_model.model_id
                chunk.embedding_version = emb_model.embedding_version
                chunk.embedding_dimensions = emb_model.embedding_dimensions
                chunk.embedded_at = datetime.now(timezone.utc)
                backfilled_count += 1
        
        try:
            await db.commit()
            logger.info("backfill.batch_committed", backfilled_count=backfilled_count)
        except Exception as commit_err:
            await db.rollback()
            logger.error("backfill.commit_failed", error=str(commit_err))
            break
            
    return backfilled_count
