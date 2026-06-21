import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_list_knowledge(client: AsyncClient, db):
    from proxima.models.ai import DomainKnowledgeChunk
    
    unique_kb = f"test_kb_{uuid.uuid4().hex[:8]}"
    chunks = [
        DomainKnowledgeChunk(
            kb_name=unique_kb,
            title=f"Chunk {i}",
            content=f"Content {i}",
            chunk_index=i,
            token_count=10
        )
        for i in range(3)
    ]
    db.add_all(chunks)
    await db.commit()
    
    response = await client.get(f"/api/admin/knowledge?kb_name={unique_kb}", headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3

@pytest.mark.asyncio
async def test_sync_knowledge(client: AsyncClient, db):
    payload = {
        "kb_name": "test_kb",
        "force_reindex": True
    }
    response = await client.post("/api/admin/knowledge/sync", json=payload, headers={"X-Test-Role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["kb_name"] == "test_kb"
