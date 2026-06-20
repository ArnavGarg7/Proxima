import pytest
from proxima.services.prompt_registry import PromptRegistryService

@pytest.mark.asyncio
async def test_prompt_seeding_and_retrieval(db):
    registry = PromptRegistryService(db)
    
    # Initial seed
    await registry.seed_canonical_prompts()
    
    # Retrieve standard
    prompt = await registry.get_prompt("system_legal")
    assert prompt is not None
    assert "legal AI assistant" in prompt

@pytest.mark.asyncio
async def test_prompt_saving_and_versioning(db):
    registry = PromptRegistryService(db)
    
    # Save first version
    v1 = await registry.save_prompt("custom_prompt", "Version 1 text")
    assert v1 == 1
    
    # Save second version
    v2 = await registry.save_prompt("custom_prompt", "Version 2 text")
    assert v2 == 2
    
    # Retrieve specific version
    p1 = await registry.get_prompt("custom_prompt", version=1)
    assert p1 == "Version 1 text"
    
    # Retrieve latest
    p_latest = await registry.get_prompt("custom_prompt")
    assert p_latest == "Version 2 text"

@pytest.mark.asyncio
async def test_prompt_caching(db):
    registry = PromptRegistryService(db)
    await registry.save_prompt("cache_test", "Initial content")
    
    # First fetch populates cache
    p1 = await registry.get_prompt("cache_test")
    assert p1 == "Initial content"
    
    # Verify it hits cache directly (modifying db directly bypassing cache to prove it)
    from proxima.models.ai import PromptVersion
    from sqlalchemy import select, update
    
    await db.execute(update(PromptVersion).where(PromptVersion.prompt_key == "cache_test").values(content="Secret DB update"))
    await db.commit()
    
    p2 = await registry.get_prompt("cache_test")
    # Should still be cached
    assert p2 == "Initial content"
