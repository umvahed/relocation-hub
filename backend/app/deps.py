import hmac
from typing import Annotated

from fastapi import Header, HTTPException
from supabase import create_client

from app.config import settings

_auth_client = None


def _get_auth_client():
    global _auth_client
    if _auth_client is None:
        _auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _auth_client


async def get_current_user_id(authorization: Annotated[str | None, Header()] = None) -> str:
    """FastAPI dependency: verifies Supabase JWT and returns the authenticated user's UUID."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization[7:]
    try:
        client = _get_auth_client()
        response = client.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_cron_secret(authorization: Annotated[str | None, Header()] = None) -> None:
    """FastAPI dependency: verifies the shared cron secret sent by cron-job.org / GitHub Actions."""
    if not settings.CRON_SECRET:
        raise HTTPException(status_code=503, detail="Cron secret not configured")
    expected = f"Bearer {settings.CRON_SECRET}"
    if not hmac.compare_digest(authorization or "", expected):
        raise HTTPException(status_code=401, detail="Unauthorised")


def verify_admin_secret(
    x_admin_secret: Annotated[str | None, Header(alias="x-admin-secret")] = None,
) -> None:
    """FastAPI dependency: verifies the admin secret with constant-time comparison."""
    if not settings.ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin access not configured")
    if not hmac.compare_digest(x_admin_secret or "", settings.ADMIN_SECRET):
        raise HTTPException(status_code=403, detail="Forbidden")
