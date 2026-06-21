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

@pytest_asyncio.fixture(scope="function", autouse=True)
async def auth_override(app, db):
    from proxima.middleware.auth_middleware import get_current_user
    from proxima.models.core import User
    from sqlalchemy import select
    import uuid
    from fastapi import Request

    async def mock_get_current_user(request: Request):
        test_role = request.headers.get("X-Test-Role", "user")
        
        result = await db.execute(select(User).where(User.role == test_role).limit(1))
        user = result.scalars().first()
        if not user:
            user = User(email=f"{test_role}@example.com", name=f"Test {test_role.capitalize()}", role=test_role)
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)
