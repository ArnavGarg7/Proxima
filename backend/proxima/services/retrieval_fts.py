"""
FTS Retrieval Service.

Performs knowledge lookup and context retrieval using PostgreSQL
Full Text Search. Strictly avoids vector embeddings and pgvector
similarity search.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from proxima.models.core import DocumentChunk

class FTSRetrievalService:
    def __init__(self, db_session: AsyncSession):
        """
        Initialize the FTSRetrievalService.
        
        Args:
            db_session (AsyncSession): The active SQLAlchemy async session.
        """
        self.db_session = db_session

    async def search(self, query: str, document_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Searches DocumentChunks using PostgreSQL tsvector and plainto_tsquery.
        """
        if not query.strip():
            return []

        # We construct a raw SQL statement for PostgreSQL FTS
        # ts_rank scores the relevance.
        sql = """
            SELECT chunk_id, document_id, chunk_index, content,
                   ts_rank(to_tsvector('english', content), plainto_tsquery('english', :query)) AS rank
            FROM document_chunks
            WHERE document_id = :doc_id
              AND to_tsvector('english', content) @@ plainto_tsquery('english', :query)
        """
        
        params = {"query": query, "doc_id": document_id, "limit": limit}
        
        sql += " ORDER BY rank DESC LIMIT :limit"
        
        result = await self.db_session.execute(text(sql), params)
        rows = result.fetchall()
        
        return [
            {
                "chunk_id": str(row.chunk_id),
                "document_id": str(row.document_id),
                "chunk_index": row.chunk_index,
                "content": row.content,
                "rank": float(row.rank)
            }
            for row in rows
        ]

    def build_context_package(self, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Takes ranked retrieved chunks and packages them into a single 
        context string compatible with PromptAssemblerService.
        """
        if not retrieved_chunks:
            return "No relevant context found."
            
        # Ensure they are sorted by rank (they should be, but just to be sure)
        sorted_chunks = sorted(retrieved_chunks, key=lambda x: x["rank"], reverse=True)
        
        context_parts = []
        for idx, chunk in enumerate(sorted_chunks):
            # Using simple newline separation to match PromptAssembler expectations
            context_parts.append(f"[Excerpt {idx+1} | Relevance: {chunk['rank']:.2f}]\n{chunk['content']}")
            
        return "\n\n".join(context_parts)
