"""
Document Ingestion Service.

Responsible for coordinating the extraction of text from uploaded files,
fallback to OCR if necessary, managing ingestion state, and delegating
chunking to the ChunkingService.
"""

from proxima.services.chunking import ChunkingService
from proxima.models.core import Document, DocumentChunk
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import fitz  # PyMuPDF
import os

class DocumentIngestionService:
    def __init__(self, chunking_service: ChunkingService, db_session: AsyncSession):
        """
        Initialize the DocumentIngestionService with required dependencies.
        
        Args:
            chunking_service (ChunkingService): Service used for text chunking.
            db_session (AsyncSession): SQLAlchemy async session for DB operations.
        """
        self.chunking_service = chunking_service
        self.db = db_session

    async def ingest_document(self, document_id: str, file_path_or_uri: str) -> bool:
        """
        Main pipeline method to process a stored document. Handles text extraction,
        uses the chunking service, and saves chunks to the database.
        """
        try:
            # Update status to processing
            result = await self.db.execute(select(Document).where(Document.document_id == document_id))
            document = result.scalar_one_or_none()
            if not document:
                return False
                
            document.status = "processing"
            await self.db.commit()

            # Extract text
            ext = os.path.splitext(file_path_or_uri)[1].lower()
            text = ""
            if ext == ".pdf":
                with fitz.open(file_path_or_uri) as doc:
                    for page in doc:
                        text += page.get_text() + "\n"
            elif ext in [".txt", ".md", ".markdown"]:
                with open(file_path_or_uri, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()
            else:
                document.status = "failed"
                await self.db.commit()
                return False

            # Extract Text Fallback Hook
            text = self._extract_text_fallback(text, file_path_or_uri)

            if not text.strip():
                document.status = "failed"
                await self.db.commit()
                return False

            # Chunk text
            chunks = self.chunking_service.chunk_text(text)

            # Persist chunks
            for idx, chunk_text in enumerate(chunks):
                new_chunk = DocumentChunk(
                    document_id=document.document_id,
                    chunk_index=idx,
                    content=chunk_text,
                    chunk_type="text"
                )
                self.db.add(new_chunk)

            # Update status to processed
            document.status = "processed"
            await self.db.commit()
            return True

        except Exception as e:
            import traceback
            traceback.print_exc()
            # Ensure failed status is saved on error
            try:
                document.status = "failed"
                await self.db.commit()
            except Exception:
                pass
            return False

    def _extract_text_fallback(self, text: str, file_path: str) -> str:
        """
        Extracts raw text from a binary file stream. Includes OCR fallback logic.
        Stubbed for now, returns original text.
        """
        return text
