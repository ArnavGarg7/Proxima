"""Stage 8: production fail-fast configuration validation."""
from types import SimpleNamespace

import pytest

from proxima.main import validate_production_config, _resolve_cors_origins


def _cfg(**over):
    base = dict(
        environment="production",
        session_secret="s3cr3t",
        jwt_private_key="-----BEGIN RSA PRIVATE KEY-----\nx\n-----END RSA PRIVATE KEY-----",
        jwt_public_key="-----BEGIN PUBLIC KEY-----\nx\n-----END PUBLIC KEY-----",
        database_url="postgresql+asyncpg://u:p@db:5432/proxima",
        cors_origins="https://app.example.com",
        gemini_api_key="key",
        openai_api_key="",
    )
    base.update(over)
    ns = SimpleNamespace(**base)
    ns.is_production = base["environment"] == "production"
    return ns


def test_valid_production_config_passes():
    validate_production_config(_cfg())  # no raise


def test_development_skips_validation():
    # Everything missing, but development => no fail-fast.
    validate_production_config(_cfg(environment="development", session_secret="", jwt_private_key="", jwt_public_key="", gemini_api_key=""))


@pytest.mark.parametrize("missing_key,over", [
    ("SESSION_SECRET", {"session_secret": ""}),
    ("JWT_PRIVATE_KEY", {"jwt_private_key": ""}),
    ("JWT_PUBLIC_KEY", {"jwt_public_key": ""}),
    ("DATABASE_URL", {"database_url": ""}),
    ("CORS_ORIGINS", {"cors_origins": ""}),
])
def test_missing_required_key_fails(missing_key, over):
    with pytest.raises(RuntimeError) as exc:
        validate_production_config(_cfg(**over))
    assert missing_key in str(exc.value)


def test_missing_all_provider_keys_fails():
    with pytest.raises(RuntimeError) as exc:
        validate_production_config(_cfg(gemini_api_key="", openai_api_key=""))
    assert "GEMINI_API_KEY" in str(exc.value)


def test_openai_key_satisfies_provider_requirement():
    validate_production_config(_cfg(gemini_api_key="", openai_api_key="ok"))  # no raise


def test_error_never_contains_secret_values():
    with pytest.raises(RuntimeError) as exc:
        validate_production_config(_cfg(session_secret="", jwt_private_key="", database_url="postgresql://user:SUPERSECRET@h/db"))
    msg = str(exc.value)
    assert "SUPERSECRET" not in msg  # only key names, never values


def test_cors_wildcard_rejected_in_production():
    with pytest.raises(RuntimeError):
        _resolve_cors_origins(_cfg(cors_origins="*"))


def test_cors_wildcard_allowed_in_development():
    origins = _resolve_cors_origins(_cfg(environment="development", cors_origins="*"))
    assert origins == ["*"]


def test_cors_parses_multiple_origins():
    origins = _resolve_cors_origins(_cfg(cors_origins="https://a.com, https://b.com"))
    assert origins == ["https://a.com", "https://b.com"]
