from fastapi import APIRouter, Depends, Response, Request
from authlib.integrations.starlette_client import OAuth
from proxima.config import settings
from proxima.services.auth_service import get_cookie_settings
import secrets

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@router.get("/google")
async def login_google(request: Request):
    # PKCE will be managed by Authlib natively or can be done manually
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    # This is a stub for Stage 1 structure
    # In full implementation: fetch token, user info, issue JWT, set cookies
    token = await oauth.google.authorize_access_token(request)
    user = token.get('userinfo')
    
    # We apply cookie settings from Readiness Report
    cookie_settings = get_cookie_settings()
    
    # response.set_cookie(key="access_token", value="stub_jwt", **cookie_settings)
    return {"status": "ok", "message": "auth callback stub"}

@router.post("/refresh")
async def refresh_token():
    return {"status": "ok", "message": "refresh stub"}

@router.post("/logout")
async def logout():
    return {"status": "ok", "message": "logout stub"}
