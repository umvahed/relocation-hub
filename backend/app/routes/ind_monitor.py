from typing import Annotated
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

router = APIRouter()
_supabase = None

IND_BOOKING_URL = "https://oap.ind.nl/oap/en/#/doc"

# oap.ind.nl blocks all cloud and proxy IPs — automated slot detection is not feasible.
# The monitor works as a scheduled reminder: email subscribers to check themselves,
# with a direct link and tips on when slots tend to appear.
REMINDER_INTERVAL_HOURS = 8  # send at most once every 8h per subscriber


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


class SubscribeRequest(BaseModel):
    user_id: str
    email: str


def _send_reminder(email: str) -> bool:
    subject = "Reminder: check your IND appointment slots"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Relocation<span style="color: #4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 12px;">IND Appointment Reminder</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 20px;">
        It's time to check for available IND appointment slots. Slots can appear and disappear quickly — checking regularly gives you the best chance.
      </p>
      <a href="{IND_BOOKING_URL}"
         style="display: inline-block; background: #4f46e5; color: #fff; font-size: 15px; font-weight: 600;
                padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-bottom: 24px;">
        Check slots now →
      </a>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="font-size: 13px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">💡 Tips for finding slots</p>
        <ul style="font-size: 13px; color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Monday mornings often have new slots after the weekend</li>
          <li>Check again after 17:00 — cancellations happen end of business day</li>
          <li>Try all four desk locations: Amsterdam, Den Haag, Zwolle, 's-Hertogenbosch</li>
          <li>Book immediately when you see a slot — they fill within minutes</li>
        </ul>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">
        You're receiving this because you subscribed to IND appointment reminders.
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
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=REMINDER_INTERVAL_HOURS)).isoformat()

    # Only remind subscribers who haven't been notified within the interval
    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email, last_notified_at")
        .eq("active", True)
        .execute()
    )

    now = datetime.now(timezone.utc).isoformat()
    notified = 0
    for sub in subs.data or []:
        last = sub.get("last_notified_at")
        if last and last > cutoff:
            continue  # reminded recently — skip
        if _send_reminder(sub["email"]):
            supabase.table("ind_monitor_subscriptions").update(
                {"last_notified_at": now}
            ).eq("user_id", sub["user_id"]).execute()
            notified += 1

    # Log run
    supabase.table("ind_monitor_cache").insert({
        "slots_available": False,
        "status_text": f"Reminder sent to {notified} subscriber(s)" if notified else "No reminders due",
    }).execute()

    # Prune cache
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

    return {"notified": notified, "mode": "reminder"}
