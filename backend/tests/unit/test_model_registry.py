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
