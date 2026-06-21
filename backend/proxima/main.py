from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from proxima.config import settings

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
    intelligence_router
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
