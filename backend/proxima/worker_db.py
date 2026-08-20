"""
Synchronous database infrastructure for Celery workers (Stage 7C).

The FastAPI process uses async SQLAlchemy + asyncpg. Celery workers must NOT
bridge asyncpg via asyncio.run(); instead they use a dedicated synchronous
SQLAlchemy engine backed by psycopg2. This keeps the execution boundaries clean:

    FastAPI  → async SQLAlchemy / asyncpg
    Celery   → sync  SQLAlchemy / psycopg2

Both share the same declarative models (proxima.models) and the same database.
"""

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from proxima.config import settings


def _to_sync_url(url: str) -> str:
    """Translate the async database URL into a psycopg2 (sync) URL."""
    if "+asyncpg" in url:
        return url.replace("+asyncpg", "+psycopg2")
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


# A modest pool: workers are typically few and each task uses one connection.
sync_engine = create_engine(
    _to_sync_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    future=True,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    future=True,
)


@contextmanager
def get_sync_session() -> Iterator[Session]:
    """Yield a synchronous SQLAlchemy session, rolling back on error."""
    session = SyncSessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
