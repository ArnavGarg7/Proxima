import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from proxima.database import AsyncSessionLocal
from proxima.models.core import Document
import uuid

async def check_doc():
    doc_id = "9d4832bc-041b-46b3-8c70-e746b822c469"
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, uuid.UUID(doc_id))
        if doc:
            print(f"Document found! ID: {doc.document_id}, User ID: {doc.user_id}, Title: {doc.title}")
        else:
            print(f"Document {doc_id} NOT FOUND in DB.")

if __name__ == "__main__":
    asyncio.run(check_doc())
