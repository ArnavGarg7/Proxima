import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from proxima.database import AsyncSessionLocal

# Hardening: Inject dynamic RSA keys for testing BEFORE importing the app
# This guarantees that tests will pass even if CI injects invalid or empty keys
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from proxima.config import settings

test_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
test_private_pem = test_private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
).decode()
test_public_key = test_private_key.public_key()
test_public_pem = test_public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode()

settings.jwt_private_key = test_private_pem
settings.jwt_public_key = test_public_pem
settings.jwt_algorithm = "RS256"

from proxima.main import app


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
