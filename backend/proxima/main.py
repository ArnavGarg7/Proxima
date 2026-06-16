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

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "engineer": "Arnav Garg",
        "version": "4.0"
    }

# We will include routers here once they are built
