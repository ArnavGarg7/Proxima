from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from proxima.config import settings
from cryptography.hazmat.primitives import serialization
import structlog

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

# Fail-fast validation at startup
validate_rsa_keys(settings.jwt_private_key, settings.jwt_public_key)


app = FastAPI(
    title="Proxima API",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")] if hasattr(settings, 'cors_origins') else [settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret or "proxima-dev-session-secret")

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "engineer": "Arnav Garg",
        "version": "4.0"
    }

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
