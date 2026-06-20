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

@pytest.fixture(scope="session")
def app():
    from proxima.main import app as main_app
    return main_app

@pytest_asyncio.fixture(scope="function")
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c

@pytest_asyncio.fixture(scope="function")
async def db():
    from proxima.database import engine
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
        await session.rollback()
