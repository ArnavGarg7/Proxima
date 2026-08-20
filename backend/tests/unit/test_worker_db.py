"""Synchronous worker DB session (Stage 7C)."""
from sqlalchemy import text

from proxima.worker_db import get_sync_session, _to_sync_url


def test_sync_url_translation():
    assert _to_sync_url("postgresql+asyncpg://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"
    assert _to_sync_url("postgresql://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"


def test_sync_session_executes():
    with get_sync_session() as db:
        result = db.execute(text("SELECT 1")).scalar_one()
        assert result == 1
