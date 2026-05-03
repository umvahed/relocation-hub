from typing import Annotated
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx
from datetime import datetime, timezone
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

router = APIRouter()
_supabase = None

IND_URL = "https://www.ind.nl/en/make-an-appointment-with-ind"
# Text present on IND page when NO slots are available
_NO_SLOT_PHRASES = [
    "it is currently not possible to make an appointment",
    "no appointments available",
    "appointment is not possible",
    "niet mogelijk een afspraak",
]


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


class SubscribeRequest(BaseModel):
    user_id: str
    email: str


async def _fetch_ind_status() -> tuple[bool, str]:
    """Return (slots_available, status_text). Raises on network error."""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(IND_URL)
    resp.raise_for_status()
    text = resp.text.lower()
    available = not any(phrase in text for phrase in _NO_SLOT_PHRASES)
    status = "Slots appear available" if available else "No slots currently available"
    return available, status


def _send_alert(email: str, slots_available: bool, status_text: str) -> bool:
    subject = "IND appointment slots are now available!" if slots_available else "IND appointment update"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Relocation<span style="color: #4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 12px;">IND Appointment Monitor</h2>
      <div style="background: {'#f0fdf4' if slots_available else '#fef3c7'}; border: 1px solid {'#bbf7d0' if slots_available else '#fde68a'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 15px; font-weight: 600; color: {'#15803d' if slots_available else '#92400e'};">
          {'✅ ' + status_text if slots_available else '⚠️ ' + status_text}
        </div>
        {'<p style="font-size: 13px; color: #374151; margin: 8px 0 0;">Book your appointment at <a href="' + IND_URL + '" style="color: #4f46e5;">ind.nl</a> before slots fill up again.</p>' if slots_available else ''}
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">
        You'll receive another alert when the status changes.
        <a href="{settings.FRONTEND_URL}/dashboard" style="color: #4f46e5; text-decoration: none;">Manage alerts</a>
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


@router.post("/ind-monitor/subscribe")
async def subscribe(body: SubscribeRequest):
    supabase = get_supabase()
    try:
        supabase.table("ind_monitor_subscriptions").upsert(
            {"user_id": body.user_id, "email": body.email, "active": True},
            on_conflict="user_id",
        ).execute()
        return {"subscribed": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/ind-monitor/subscribe/{user_id}")
async def unsubscribe(user_id: str):
    supabase = get_supabase()
    try:
        supabase.table("ind_monitor_subscriptions").update({"active": False}).eq(
            "user_id", user_id
        ).execute()
        return {"subscribed": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ind-monitor/status/{user_id}")
async def get_status(user_id: str):
    supabase = get_supabase()
    try:
        sub = (
            supabase.table("ind_monitor_subscriptions")
            .select("active, last_notified_at, created_at")
            .eq("user_id", user_id)
            .execute()
        )
        latest = (
            supabase.table("ind_monitor_cache")
            .select("*")
            .order("checked_at", desc=True)
            .limit(1)
            .execute()
        )
        return {
            "subscribed": bool(sub.data and sub.data[0]["active"]),
            "subscription": sub.data[0] if sub.data else None,
            "latest_check": latest.data[0] if latest.data else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ind-monitor/check")
async def check_ind(authorization: Annotated[str | None, Header()] = None):
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")

    supabase = get_supabase()

    # Fetch previous state
    prev = (
        supabase.table("ind_monitor_cache")
        .select("slots_available")
        .order("checked_at", desc=True)
        .limit(1)
        .execute()
    )
    prev_available = prev.data[0]["slots_available"] if prev.data else None

    try:
        slots_available, status_text = await _fetch_ind_status()
    except Exception as e:
        return {"error": str(e), "notified": 0}

    # Log result
    supabase.table("ind_monitor_cache").insert(
        {"slots_available": slots_available, "status_text": status_text}
    ).execute()

    # Prune cache — keep last 100 rows
    old_rows = (
        supabase.table("ind_monitor_cache")
        .select("id")
        .order("checked_at", desc=True)
        .offset(100)
        .limit(500)
        .execute()
    )
    if old_rows.data:
        ids = [r["id"] for r in old_rows.data]
        supabase.table("ind_monitor_cache").delete().in_("id", ids).execute()

    # Only notify when state changes to available
    state_changed = prev_available is not None and (not prev_available) and slots_available
    notified = 0

    if state_changed:
        subs = (
            supabase.table("ind_monitor_subscriptions")
            .select("user_id, email, last_notified_at")
            .eq("active", True)
            .execute()
        )
        now = datetime.now(timezone.utc).isoformat()
        for sub in subs.data or []:
            if _send_alert(sub["email"], slots_available, status_text):
                supabase.table("ind_monitor_subscriptions").update(
                    {"last_notified_at": now}
                ).eq("user_id", sub["user_id"]).execute()
                notified += 1

    return {
        "slots_available": slots_available,
        "status_text": status_text,
        "prev_available": prev_available,
        "state_changed": state_changed,
        "notified": notified,
    }
