import secrets

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from cryptography.hazmat.primitives import serialization
import structlog

from proxima.config import settings
from proxima.observability import init_observability

# Configure logging / error reporting before anything else emits a log line.
init_observability()
logger = structlog.get_logger()


def validate_rsa_keys(private_key: str, public_key: str) -> None:
    if private_key and public_key:
        try:
            serialization.load_pem_private_key(private_key.encode(), password=None)
            serialization.load_pem_public_key(public_key.encode())
            logger.info("auth.keys_validated")
        except Exception as e:
            logger.error("auth.keys_invalid", error=str(e))
            raise RuntimeError(f"Invalid JWT keys: {e}")


def validate_production_config(cfg) -> None:
    """Fail fast (before serving traffic) if a production deployment is missing
    required configuration. Reports the missing KEY names only — never values."""
    if not cfg.is_production:
        return

    missing = []
    if not cfg.session_secret:
        missing.append("SESSION_SECRET")
    if not cfg.jwt_private_key:
        missing.append("JWT_PRIVATE_KEY")
    if not cfg.jwt_public_key:
        missing.append("JWT_PUBLIC_KEY")
    if not cfg.database_url:
        missing.append("DATABASE_URL")
    if not (cfg.cors_origins or "").strip():
        missing.append("CORS_ORIGINS")
    # The default generation and embedding models are Google; at least one
    # generation-capable provider key must be present.
    if not (cfg.gemini_api_key or cfg.openai_api_key):
        missing.append("GEMINI_API_KEY (or OPENAI_API_KEY)")

    if missing:
        raise RuntimeError(
            "Missing required production configuration: " + ", ".join(missing)
        )


def _resolve_cors_origins(cfg) -> list[str]:
    origins = [o.strip() for o in (cfg.cors_origins or "").split(",") if o.strip()]
    if not origins:
        origins = [cfg.frontend_url]
    # allow_credentials=True is incompatible with a wildcard origin; refuse it in
    # production rather than silently shipping an unsafe CORS policy.
    if "*" in origins and cfg.is_production:
        raise RuntimeError(
            "CORS wildcard ('*') cannot be combined with credentialed requests in production; "
            "set CORS_ORIGINS to explicit origins."
        )
    return origins


# ── Fail-fast startup validation ─────────────────────────────────────────────
validate_production_config(settings)
validate_rsa_keys(settings.jwt_private_key, settings.jwt_public_key)

# In production, session_secret is guaranteed present by validate_production_config.
# In development, generate an ephemeral per-boot secret instead of a hardcoded
# (now public) constant.
_session_secret = settings.session_secret or secrets.token_hex(32)
_cors_origins = _resolve_cors_origins(settings)


app = FastAPI(
    title="Proxima API",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=_session_secret)


# ── Health / readiness ───────────────────────────────────────────────────────
async def _check_database() -> None:
    from proxima.database import engine

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def _check_redis() -> None:
    import redis.asyncio as redis_asyncio

    client = redis_asyncio.from_url(settings.redis_url)
    try:
        await client.ping()
    finally:
        await client.aclose()


@app.get("/api/health")
async def health_check():
    """Readiness: verifies the process can reach its critical dependencies.
    Returns 503 when any dependency is unavailable so an orchestrator can gate
    traffic. Never exposes connection strings or credentials."""
    checks: dict[str, str] = {}
    healthy = True
    for name, check in (("database", _check_database), ("redis", _check_redis)):
        try:
            await check()
            checks[name] = "ok"
        except Exception as e:  # noqa: BLE001 - report unhealthy, log detail server-side
            checks[name] = "unavailable"
            healthy = False
            logger.error("health.check_failed", component=name, error=str(e))

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"status": "ok" if healthy else "unavailable", "checks": checks, "version": "4.0"},
    )


@app.get("/api/health/live")
async def liveness_check():
    """Liveness: the process is up. No dependency checks."""
    return {"status": "ok"}


# Import all routers
from proxima.routers import (
    auth_router,
    users_router,
    documents_router,
    tools_router,
    templates_router,
    exports_router,
    sessions_router,
    jobs_router,
    admin_router,
    intelligence_router,
    dashboard_router
)

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(documents_router)
app.include_router(tools_router)
app.include_router(templates_router)
app.include_router(exports_router)
app.include_router(sessions_router)
app.include_router(jobs_router)
app.include_router(admin_router)
app.include_router(intelligence_router)
app.include_router(dashboard_router)
