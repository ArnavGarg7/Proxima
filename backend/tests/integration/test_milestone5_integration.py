import pytest
from httpx import AsyncClient
import json
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_intelligence_complete_endpoint(db, app):
    # This requires a user, a document, and some chunks.
    from proxima.models.core import Document, DocumentChunk, User
    from proxima.models import RegisteredModel
    from sqlalchemy import select
    
    # Setup user
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        user = User(email="m5@example.com", name="M5 User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Setup document
    doc = Document(user_id=user.user_id, title="m5_test.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # Setup chunks
    chunk = DocumentChunk(
        document_id=doc.document_id, 
        chunk_index=0, 
        content="The API streaming is robust.", 
        chunk_type="text"
    )
    db.add(chunk)
    await db.commit()

    # Setup RegisteredModel
    result = await db.execute(select(RegisteredModel).where(RegisteredModel.is_default_generation == True))
    model = result.scalars().first()
    if not model:
        model = RegisteredModel(
            model_id="gemini-2.5-flash-m5",
            provider="google",
            model_type="generation",
            is_active=True,
            is_default_generation=True,
            cost_per_1m_input=0.15,
            cost_per_1m_output=0.60
        )
        db.add(model)
        await db.commit()
    
    # Mock the GoogleProvider's stream_completion so we don't hit real Gemini
    async def mock_stream_completion(*args, **kwargs):
        yield "Mocked stream output "
        yield "is working."

    # Need to patch the ModelRegistry's stream_completion or GoogleProvider
    with patch('proxima.services.providers.google_provider.GoogleProvider.stream_completion', new=mock_stream_completion):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post("/api/intelligence/complete", json={
                "document_id": str(doc.document_id),
                "user_task": "What is robust?"
            })
            
            assert response.status_code == 200
            
            # Since it's SSE, we can read lines
            lines = response.text.strip().split("\n\n")
            
            assert "data: " in lines[0]
            assert "Mocked stream output" in lines[0]
            
            assert "data: " in lines[1]
            assert "is working." in lines[1]
            
            # The QHE result should be next
            assert "qhe" in lines[2]
            
            # Finally, DONE
            assert "[DONE]" in lines[3]
