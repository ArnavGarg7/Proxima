import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from proxima.main import app
from proxima.database import AsyncSessionLocal

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c

@pytest_asyncio.fixture(scope="function")
async def db():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()
