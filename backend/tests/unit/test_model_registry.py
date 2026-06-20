import pytest
from proxima.services.model_registry import model_registry

@pytest.mark.asyncio
async def test_get_provider_google():
    """Test that the Google provider is initialized correctly."""
    provider = model_registry._get_provider('google')
    assert provider is not None
    assert type(provider).__name__ == 'GoogleProvider'

@pytest.mark.asyncio
async def test_get_provider_unknown():
    """Test that an unknown provider raises ValueError."""
    with pytest.raises(ValueError, match="Unknown provider: nonexistent"):
        model_registry._get_provider('nonexistent')

@pytest.mark.asyncio
async def test_registry_routing(db):
    from proxima.models import RegisteredModel
    from sqlalchemy import select
    result = await db.execute(select(RegisteredModel).where(RegisteredModel.is_default_generation == True))
    model = result.scalars().first()
    if not model:
        model = RegisteredModel(
            model_id="gemini-2.5-flash-test-routing",
            provider="google",
            model_type="generation",
            is_active=True,
            is_default_generation=True,
            cost_per_1m_input=0.15,
            cost_per_1m_output=0.60
        )
        db.add(model)
        await db.commit()
    
    # 2. Test routing fallback
    retrieved_model = await model_registry.get_default_generation(db)
    
    assert retrieved_model.model_id == model.model_id
    assert retrieved_model.provider == "google"
