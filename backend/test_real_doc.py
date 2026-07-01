import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Ensure python path
sys.path.append(r"d:\Projects\Proxima\backend")

from proxima.services.general_document_analyzer import GeneralDocumentAnalyzer
from proxima.models.core import Document

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:password@127.0.0.1:5432/proxima")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        from proxima.models.core import DocumentVersion
        stmt = select(Document, DocumentVersion).join(DocumentVersion, Document.document_id == DocumentVersion.document_id).limit(1)
        result = await db.execute(stmt)
        row = result.first()
        
        if not row:
            print("No documents found")
            return
            
        doc, doc_ver = row
        print(f"Analyzing document: {doc.title}, length: {len(doc_ver.content)}")
        
        res = await GeneralDocumentAnalyzer.analyze(
            db, 
            full_text=doc_ver.content, 
            metadata={"title": doc.title}
        )
        print(res)

if __name__ == "__main__":
    asyncio.run(main())
