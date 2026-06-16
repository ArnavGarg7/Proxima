from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from proxima.services.auth_service import decode_token

class AdminMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only enforce on /api/admin routes
        if request.url.path.startswith("/api/admin"):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse({"detail": "Missing or invalid token"}, status_code=401)
            
            token = auth_header.split(" ")[1]
            try:
                payload = decode_token(token)
                role = payload.get("role")
                if role != "admin":
                    return JSONResponse({"detail": "Admin access required"}, status_code=403)
            except Exception:
                return JSONResponse({"detail": "Invalid token"}, status_code=401)
                
        response = await call_next(request)
        return response
