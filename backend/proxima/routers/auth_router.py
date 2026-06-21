from fastapi import APIRouter, Depends, Response, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.config import settings
from proxima.database import get_db
from proxima.services.auth_service import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    find_or_create_user,
    get_cookie_settings,
    decode_token,
)
from proxima.models.core import User
from jose import JWTError
import structlog
import uuid

logger = structlog.get_logger()

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
    """Initiate Google OAuth flow."""
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Handle Google OAuth callback.

    Flow:
    1. Exchange code for tokens via Google
    2. Extract user profile from userinfo
    3. Find or create user in database
    4. Issue access + refresh JWT tokens
    5. Set HttpOnly cookies
    6. Redirect to frontend workspace
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.error("auth.callback_token_error", error=str(e))
        return RedirectResponse(url=f"{settings.frontend_url}/?error=oauth_failed")

    userinfo = token.get("userinfo")
    if not userinfo:
        logger.error("auth.callback_no_userinfo")
        return RedirectResponse(url=f"{settings.frontend_url}/?error=no_userinfo")

    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name") or email

    if not google_id or not email:
        logger.error("auth.callback_missing_fields", google_id=bool(google_id), email=bool(email))
        return RedirectResponse(url=f"{settings.frontend_url}/?error=missing_profile")

    try:
        user = await find_or_create_user(db, google_id=google_id, email=email, name=name)
    except Exception as e:
        logger.error("auth.upsert_error", error=str(e))
        return RedirectResponse(url=f"{settings.frontend_url}/?error=user_creation_failed")

    if not user.is_active:
        return RedirectResponse(url=f"{settings.frontend_url}/?error=account_inactive")

    # Issue tokens
    access_token = create_access_token(
        user_id=str(user.user_id),
        email=user.email,
        plan=user.plan,
        role=user.role,
    )
    refresh_token = create_refresh_token(user_id=str(user.user_id))

    cookie_settings = get_cookie_settings()

    # Build redirect and attach cookies
    redirect = RedirectResponse(url=f"{settings.frontend_url}/auth/callback", status_code=302)
    redirect.set_cookie(key="access_token", value=access_token, max_age=settings.access_token_expire_minutes * 60, **cookie_settings)
    redirect.set_cookie(key="refresh_token", value=refresh_token, max_age=settings.refresh_token_expire_days * 86400, **cookie_settings)

    logger.info("auth.login_success", user_id=str(user.user_id), role=user.role)
    return redirect


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token cookie.
    Issues a new access token. Does not rotate the refresh token.
    """
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    try:
        payload = verify_refresh_token(token)
    except (JWTError, ValueError) as e:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access_token = create_access_token(
        user_id=str(user.user_id),
        email=user.email,
        plan=user.plan,
        role=user.role,
    )

    cookie_settings = get_cookie_settings()
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **cookie_settings,
    )

    return {"status": "ok", "message": "Token refreshed"}


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies and end session."""
    cookie_settings = get_cookie_settings()
    # Delete cookies by setting max_age=0
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"status": "ok", "message": "Logged out"}
