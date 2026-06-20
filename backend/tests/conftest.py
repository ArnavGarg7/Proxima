import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from proxima.main import app
from proxima.database import AsyncSessionLocal

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c

@pytest_asyncio.fixture(scope="function")
async def db():
    from proxima.database import engine
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine) as session:
        async with session.begin():
            yield session
            await session.rollback()
