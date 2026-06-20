from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.database import get_db
from proxima.models.core import Document
from proxima.services.upload_security import UploadSecurityService
from proxima.services.storage_service import StorageService
import uuid

router = APIRouter(prefix="/api/documents", tags=["documents"])

# In a real system, these would likely be injected or cached singletons
security_service = UploadSecurityService()
storage_service = StorageService()

@router.get("/")
async def list_documents():
    return {"status": "stub"}

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    # In a real app we'd have a user_id from auth context, here we mock it for the milestone
):
    # Mocking user_id: fetch first user from DB to satisfy FK constraints
    from sqlalchemy import select
    from proxima.models.core import User
    
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        # Create a dummy user if db is completely empty
        user = User(email="test@example.com", name="Test User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    mock_user_id = user.user_id

    # 1. Validate Upload
    await security_service.validate_upload(file)

    # 2. Database Record Creation (to get document_id)
    new_doc = Document(
        user_id=mock_user_id,
        title=file.filename,
        status="uploaded"
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    # 3. Storage Service Save
    file_uri = await storage_service.save_file(
        file_id=str(new_doc.document_id),
        file_stream=file.file,
        original_filename=file.filename
    )

    # 4. Trigger Ingestion in Background
    from proxima.database import AsyncSessionLocal
    from proxima.services.chunking import ChunkingService
    from proxima.services.document_ingestion import DocumentIngestionService
    
    async def process_document_bg(doc_id: str, uri: str):
        async with AsyncSessionLocal() as bg_db:
            chunking_svc = ChunkingService()
            ingestion_svc = DocumentIngestionService(chunking_svc, bg_db)
            await ingestion_svc.ingest_document(doc_id, uri)
            
    background_tasks.add_task(process_document_bg, str(new_doc.document_id), file_uri)

    return {
        "message": "File uploaded successfully",
        "document_id": str(new_doc.document_id),
        "file_uri": file_uri
    }
