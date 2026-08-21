from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.database import get_db
from proxima.models.core import Document, User, BackgroundJob
from proxima.middleware.auth_middleware import get_current_user
from proxima.services.upload_security import UploadSecurityService
from proxima.services.storage_service import StorageService
import uuid

router = APIRouter(prefix="/api/documents", tags=["documents"])

# In a real system, these would likely be injected or cached singletons
security_service = UploadSecurityService()
storage_service = StorageService()

@router.get("/")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import select, desc
    
    docs_query = select(Document).where(Document.user_id == current_user.user_id).order_by(desc(Document.created_at))
    docs_result = await db.execute(docs_query)
    docs = docs_result.scalars().all()
    
    return [
        {
            "id": str(doc.document_id),
            "title": doc.title,
            "status": doc.status,
            "domain": doc.domain,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        }
        for doc in docs
    ]

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
        
    doc = await db.get(Document, doc_uuid)
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "document_id": str(doc.document_id),
        "title": doc.title,
        "status": doc.status,
        "domain": doc.domain,
        "created_at": doc.created_at.isoformat()
    }

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.user_id

    # 1. Validate Upload
    await security_service.validate_upload(file)

    # 2. Database Record Creation (to get document_id)
    new_doc = Document(
        user_id=user_id,
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

    # 4. Create a durable BackgroundJob and dispatch to Celery.
    #    The expensive parse/chunk/embed work no longer runs in the HTTP request;
    #    it is a durable job that survives a FastAPI restart (the record lives in
    #    Postgres and the message in Redis). The Celery task id is separate from
    #    our job_id — job_id is passed to the worker as an argument.
    job = BackgroundJob(
        job_id=uuid.uuid4(),
        user_id=user_id,
        job_type="document_ingestion",
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    from proxima.tasks import ingest_document
    ingest_document.delay(str(job.job_id), str(new_doc.document_id), file_uri)

    return {
        "message": "File uploaded successfully",
        "document_id": str(new_doc.document_id),
        "job_id": str(job.job_id),
        "file_uri": file_uri
    }
