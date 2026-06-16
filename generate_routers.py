import os

routers = [
    ("documents_router", "documents"),
    ("tools_router", "tools"),
    ("templates_router", "templates"),
    ("exports_router", "exports"),
    ("sessions_router", "sessions"),
    ("jobs_router", "jobs"),
    ("admin_router", "admin")
]

for filename, prefix in routers:
    with open(f"backend/proxima/routers/{filename}.py", "w") as f:
        f.write(f"""from fastapi import APIRouter

router = APIRouter(prefix="/api/{prefix}", tags=["{prefix}"])

@router.get("/")
async def list_{prefix}():
    return {{"status": "stub"}}
""")

# Create routers/__init__.py
with open("backend/proxima/routers/__init__.py", "w") as f:
    f.write("""from .auth_router import router as auth_router
from .intelligence_router import router as intelligence_router
from .users_router import router as users_router
from .documents_router import router as documents_router
from .tools_router import router as tools_router
from .templates_router import router as templates_router
from .exports_router import router as exports_router
from .sessions_router import router as sessions_router
from .jobs_router import router as jobs_router
from .admin_router import router as admin_router
""")
