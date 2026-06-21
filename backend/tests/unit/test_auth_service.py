"""
Unit tests for auth_service.py

Tests JWT token creation, decode, refresh token verification,
and the find_or_create_user upsert logic.
"""
import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from unittest.mock import AsyncMock, MagicMock, patch

from proxima.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_refresh_token,
    find_or_create_user,
)
from proxima.config import settings


# ─────────────────────────────────────────────
# JWT Unit Tests
# ─────────────────────────────────────────────

class TestCreateAccessToken:
    def test_creates_token_with_correct_claims(self):
        token = create_access_token("user-1", "test@example.com", "free", "user")
        payload = jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        assert payload["sub"] == "user-1"
        assert payload["email"] == "test@example.com"
        assert payload["plan"] == "free"
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_token_has_expiry(self):
        token = create_access_token("user-1", "test@example.com", "free", "user")
        payload = jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        assert "exp" in payload
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        assert exp > datetime.now(timezone.utc)

    def test_admin_role_encoded_correctly(self):
        token = create_access_token("admin-1", "admin@example.com", "pro", "admin")
        payload = jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        assert payload["role"] == "admin"


class TestCreateRefreshToken:
    def test_creates_refresh_token_with_correct_type(self):
        token = create_refresh_token("user-1")
        payload = jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        assert payload["sub"] == "user-1"
        assert payload["type"] == "refresh"

    def test_refresh_token_has_longer_expiry_than_access(self):
        access = create_access_token("user-1", "t@e.com", "free", "user")
        refresh = create_refresh_token("user-1")
        access_payload = jwt.decode(access, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        refresh_payload = jwt.decode(refresh, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
        assert refresh_payload["exp"] > access_payload["exp"]


class TestDecodeToken:
    def test_decodes_valid_access_token(self):
        token = create_access_token("user-1", "test@example.com", "free", "user")
        payload = decode_token(token)
        assert payload["sub"] == "user-1"

    def test_raises_on_tampered_token(self):
        token = create_access_token("user-1", "test@example.com", "free", "user")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_raises_on_garbage_input(self):
        with pytest.raises(JWTError):
            decode_token("not.a.valid.jwt.token")


class TestVerifyRefreshToken:
    def test_accepts_valid_refresh_token(self):
        token = create_refresh_token("user-1")
        payload = verify_refresh_token(token)
        assert payload["sub"] == "user-1"

    def test_rejects_access_token_as_refresh(self):
        token = create_access_token("user-1", "test@example.com", "free", "user")
        with pytest.raises(ValueError, match="Not a refresh token"):
            verify_refresh_token(token)


# ─────────────────────────────────────────────
# find_or_create_user Tests (uses mock db)
# ─────────────────────────────────────────────

@pytest.mark.asyncio
class TestFindOrCreateUser:
    async def _make_mock_db(self, existing_user=None, email_user=None):
        """Helper to build a mock AsyncSession."""
        db = AsyncMock()

        # First execute call = google_id lookup
        # Second execute call = email lookup
        google_result = MagicMock()
        google_result.scalar_one_or_none.return_value = existing_user

        email_result = MagicMock()
        email_result.scalar_one_or_none.return_value = email_user

        db.execute.side_effect = [google_result, email_result]
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        return db

    async def test_returns_existing_user_by_google_id(self):
        from proxima.models.core import User
        import uuid
        existing = User(
            user_id=uuid.uuid4(),
            google_id="gid-123",
            email="existing@example.com",
            name="Old Name",
            role="admin",
            plan="pro",
            is_active=True,
        )
        db = await self._make_mock_db(existing_user=existing)
        result = await find_or_create_user(db, "gid-123", "existing@example.com", "New Name")
        assert result.email == "existing@example.com"
        assert result.role == "admin"   # Role preserved
        assert result.plan == "pro"     # Plan preserved
        assert result.name == "New Name"  # Name updated

    async def test_links_google_id_to_email_user(self):
        from proxima.models.core import User
        import uuid
        email_user = User(
            user_id=uuid.uuid4(),
            google_id=None,
            email="linked@example.com",
            name="Linked User",
            role="user",
            plan="free",
            is_active=True,
        )
        db = await self._make_mock_db(existing_user=None, email_user=email_user)
        result = await find_or_create_user(db, "gid-new", "linked@example.com", "Linked User")
        assert result.google_id == "gid-new"  # google_id attached

    async def test_creates_new_user_with_defaults(self):
        from proxima.models.core import User
        db = await self._make_mock_db(existing_user=None, email_user=None)

        # Simulate db.refresh populating user fields after commit
        async def fake_refresh(user):
            import uuid
            user.user_id = uuid.uuid4()
        db.refresh.side_effect = fake_refresh

        result = await find_or_create_user(db, "gid-brand-new", "new@example.com", "New User")
        db.add.assert_called_once()
        added_user = db.add.call_args[0][0]
        assert added_user.role == "user"
        assert added_user.plan == "free"
        assert added_user.is_active is True
        assert added_user.google_id == "gid-brand-new"
        assert added_user.email == "new@example.com"
