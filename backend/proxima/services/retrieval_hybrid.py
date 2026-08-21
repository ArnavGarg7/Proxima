"""
Hybrid Retrieval Service.

Fuses PostgreSQL Full Text Search (FTS) and pgvector semantic searches
using Reciprocal Rank Fusion (RRF), enforcing tenant isolation boundaries.
"""

import structlog
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from proxima.models.core import Document
from proxima.services.embedding import generate_chunk_embedding

logger = structlog.get_logger()

class HybridRetrievalService:
    def __init__(self, db_session: AsyncSession):
        """
        Initialize the HybridRetrievalService.
        
        Args:
            db_session (AsyncSession): The active SQLAlchemy async session.
        """
        self.db_session = db_session

    async def resolve_scope(
        self,
        user_id: UUID,
        document_ids: Optional[List] = None,
        project_id: Optional[object] = None,
    ) -> List[UUID]:
        """
        Resolve the authoritative set of document IDs a user may retrieve over.

        The scope is ALWAYS computed from user_id server-side. Client-supplied
        document_ids / project_id can only NARROW that set (intersection), never
        widen it — a foreign or non-existent ID simply yields nothing.
        """
        user_uuid = UUID(str(user_id))
        stmt = select(Document.document_id).where(Document.user_id == user_uuid)
        if document_ids:
            uuids = [UUID(str(d)) for d in document_ids]
            stmt = stmt.where(Document.document_id.in_(uuids))
        if project_id is not None:
            stmt = stmt.where(Document.project_id == UUID(str(project_id)))
        db_result = await self.db_session.execute(stmt)
        return [row[0] for row in db_result.all()]

    async def search(
        self,
        query: str,
        user_id: UUID,
        document_ids: Optional[List[UUID]] = None,
        limit: int = 5,
        project_id: Optional[object] = None,
        per_document_cap: Optional[int] = None,
        candidate_pool: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching chunks across FTS and vector search, fusing with RRF.
        Strictly scopes the queries to documents owned by user_id.

        For multi-document scopes, `per_document_cap` bounds how many chunks any
        single document may contribute to the final result, so one document
        cannot dominate cross-document retrieval. `candidate_pool` bounds the
        FTS/vector candidate lists before fusion.
        """
        if not query.strip():
            return []

        user_uuid = UUID(str(user_id))

        # 1. Tenant boundary: resolve authorized document scopes (owned only).
        allowed_doc_ids = await self.resolve_scope(user_uuid, document_ids, project_id)

        if not allowed_doc_ids:
            logger.debug("retrieval.hybrid.empty_scope", user_id=str(user_uuid))
            return []

        # Keep the candidate pool sane.
        pool = max(candidate_pool, limit)

        # Fetch document titles for cleaner provenance citations
        doc_details_stmt = select(Document.document_id, Document.title).where(Document.document_id.in_(allowed_doc_ids))
        doc_details_res = await self.db_session.execute(doc_details_stmt)
        doc_titles = {row[0]: row[1] for row in doc_details_res.all()}

        # 2. Run FTS Search
        fts_chunks = []
        try:
            fts_sql = """
                SELECT chunk_id, document_id, chunk_index, content, metadata_fields,
                       ts_rank(to_tsvector('english', content), plainto_tsquery('english', :query)) AS rank
                FROM document_chunks
                WHERE document_id = ANY(:doc_ids)
                  AND to_tsvector('english', content) @@ plainto_tsquery('english', :query)
                ORDER BY rank DESC
                LIMIT :pool
            """
            fts_res = await self.db_session.execute(text(fts_sql), {"query": query, "doc_ids": allowed_doc_ids, "pool": pool})
            fts_chunks = fts_res.fetchall()
        except Exception as fts_err:
            logger.error("retrieval.hybrid.fts_failed", error=str(fts_err))

        # 3. Run Vector Search
        vector_chunks = []
        try:
            query_vector = await generate_chunk_embedding(self.db_session, query)
            if query_vector:
                vector_sql = """
                    SELECT chunk_id, document_id, chunk_index, content, metadata_fields,
                           (1 - (embedding <=> :query_vector)) AS similarity
                    FROM document_chunks
                    WHERE document_id = ANY(:doc_ids)
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> :query_vector
                    LIMIT :pool
                """
                vector_res = await self.db_session.execute(
                    text(vector_sql),
                    {"query_vector": query_vector, "doc_ids": allowed_doc_ids, "pool": pool}
                )
                vector_chunks = vector_res.fetchall()
        except Exception as vec_err:
            logger.error("retrieval.hybrid.vector_failed", error=str(vec_err))

        # 4. RRF Fusion & Deduplication
        # Map: chunk_id -> dict
        merged_chunks = {}
        
        # Rank mapping
        for index, row in enumerate(fts_chunks):
            chunk_id = row.chunk_id
            rank = index + 1
            meta = row.metadata_fields or {}
            merged_chunks[chunk_id] = {
                "chunk_id": str(chunk_id),
                "document_id": str(row.document_id),
                "document_title": doc_titles.get(row.document_id, "Untitled"),
                "chunk_index": row.chunk_index,
                "content": row.content,
                "page_number": meta.get("page_number", 1),
                "fts_rank": rank,
                "vector_rank": None,
                "score": 0.0
            }

        for index, row in enumerate(vector_chunks):
            chunk_id = row.chunk_id
            rank = index + 1
            meta = row.metadata_fields or {}
            
            if chunk_id in merged_chunks:
                merged_chunks[chunk_id]["vector_rank"] = rank
            else:
                merged_chunks[chunk_id] = {
                    "chunk_id": str(chunk_id),
                    "document_id": str(row.document_id),
                    "document_title": doc_titles.get(row.document_id, "Untitled"),
                    "chunk_index": row.chunk_index,
                    "content": row.content,
                    "page_number": meta.get("page_number", 1),
                    "fts_rank": None,
                    "vector_rank": rank,
                    "score": 0.0
                }

        # Calculate reciprocal rank fusion score
        # RRF = 1 / (60 + r_fts) + 1 / (60 + r_vec)
        for chunk in merged_chunks.values():
            fts_r = chunk["fts_rank"]
            vec_r = chunk["vector_rank"]
            
            fts_part = 1.0 / (60.0 + fts_r) if fts_r is not None else 0.0
            vec_part = 1.0 / (60.0 + vec_r) if vec_r is not None else 0.0
            
            chunk["score"] = fts_part + vec_part

        # Sort candidate chunks by RRF score descending
        sorted_chunks = sorted(merged_chunks.values(), key=lambda x: x["score"], reverse=True)

        # Diversity: cap how many chunks a single document may contribute so one
        # document cannot dominate a cross-document search.
        if per_document_cap is not None and sorted_chunks:
            capped = []
            per_doc_counts: Dict[str, int] = {}
            for chunk in sorted_chunks:
                did = chunk["document_id"]
                if per_doc_counts.get(did, 0) >= per_document_cap:
                    continue
                capped.append(chunk)
                per_doc_counts[did] = per_doc_counts.get(did, 0) + 1
                if len(capped) >= limit:
                    break
            sorted_chunks = capped

        if not sorted_chunks:
            fallback_sql = """
                SELECT chunk_id, document_id, chunk_index, content, metadata_fields
                FROM document_chunks
                WHERE document_id = ANY(:doc_ids)
                ORDER BY chunk_index
                LIMIT :limit
            """
            fallback_res = await self.db_session.execute(
                text(fallback_sql),
                {"doc_ids": allowed_doc_ids, "limit": limit}
            )
            fallback_rows = fallback_res.fetchall()
            for row in fallback_rows:
                meta = row.metadata_fields or {}
                sorted_chunks.append({
                    "chunk_id": str(row.chunk_id),
                    "document_id": str(row.document_id),
                    "document_title": doc_titles.get(row.document_id, "Untitled"),
                    "chunk_index": row.chunk_index,
                    "content": row.content,
                    "page_number": meta.get("page_number", 1),
                    "fts_rank": None,
                    "vector_rank": None,
                    "score": 0.001
                })

        return sorted_chunks[:limit]
