from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import json
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

router = APIRouter()
_supabase = None

IND_OAP_BASE = "https://oap.ind.nl"
IND_BOOKING_URL = "https://oap.ind.nl/oap/en/#/doc"

DESKS = [
    {"code": "AM", "name": "Amsterdam"},
    {"code": "DH", "name": "Den Haag"},
    {"code": "ZW", "name": "Zwolle"},
    {"code": "DB", "name": "'s-Hertogenbosch"},
]
PRODUCT_KEYS = [
    {"key": "TKV", "label": "Residence permit biometrics"},
    {"key": "DOC", "label": "Document pickup"},
]

REMINDER_INTERVAL_HOURS = 4
SCRAPER_PROXY_HOST = "proxy.scraperapi.com"
SCRAPER_PROXY_PORT = 8010


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


class SubscribeRequest(BaseModel):
    user_id: str
    email: str


def _get_proxies() -> Optional[dict]:
    """
    ScraperAPI proxy mode — routes traffic through Dutch residential IPs while
    curl_cffi preserves Chrome TLS fingerprint end-to-end (unlike URL mode which
    loses the fingerprint because ScraperAPI makes its own HTTP request).
    """
    key = settings.SCRAPER_API_KEY
    if not key:
        return None
    proxy_url = f"http://scraperapi.country_code=nl:{key}@{SCRAPER_PROXY_HOST}:{SCRAPER_PROXY_PORT}"
    return {"http": proxy_url, "https": proxy_url}


def _check_oap_slots() -> list[dict]:
    """
    Returns list of dicts: {desk_code, desk_name, product_key, product_label,
    first_date, slot_count} for every desk+type combination that has open slots.
    Returns [] on any failure (gracefully falls back to reminder mode).
    """
    try:
        from curl_cffi import requests as cf_requests
    except ImportError:
        return []

    proxies = _get_proxies()
    if not proxies:
        return []

    session = cf_requests.Session(impersonate="chrome120")

    # Establish PROFILE session cookie — required by Apache backend
    try:
        session.get(f"{IND_OAP_BASE}/oap/en/", proxies=proxies, timeout=15)
    except Exception:
        pass

    found = []
    for desk in DESKS:
        for pk in PRODUCT_KEYS:
            url = (
                f"{IND_OAP_BASE}/oap/api/desks/{desk['code']}/slots/"
                f"?productKey={pk['key']}&persons=1"
            )
            try:
                r = session.get(url, proxies=proxies, timeout=20)
                if r.status_code != 200:
                    continue
                text = r.text.strip()
                # OAP wraps responses in `while(...)` as an anti-CSRF measure
                if text.startswith("while("):
                    text = text[6:]
                    if text.endswith(")"):
                        text = text[:-1]
                data = json.loads(text)
                slots = data.get("data") or []
                if slots:
                    found.append({
                        "desk_code": desk["code"],
                        "desk_name": desk["name"],
                        "product_key": pk["key"],
                        "product_label": pk["label"],
                        "first_date": slots[0].get("date"),
                        "slot_count": len(slots),
                    })
            except Exception:
                continue

    return found


def _send_slots_email(email: str, slots: list[dict]) -> bool:
    subject = "IND appointment slots are available — book now!"

    slots_html = "".join(
        f"""
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                    padding:12px 16px;margin-bottom:8px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
            {s['desk_name']} — {s['product_label']}
          </p>
          <p style="margin:4px 0 0;font-size:13px;color:#374151;">
            First available: <strong>{s['first_date']}</strong> &nbsp;·&nbsp; {s['slot_count']} slot(s)
          </p>
        </div>
        """
        for s in slots
    )

    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;
                padding:32px 24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;color:#1a1a1a;">
          Relocation<span style="color:#4f46e5;">Hub</span>
        </span>
      </div>
      <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">
        🎉 IND appointment slots are available!
      </h2>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;">
        We found open slots — book immediately before they disappear.
      </p>
      {slots_html}
      <a href="{IND_BOOKING_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:10px;
                text-decoration:none;margin:16px 0 24px;">
        Book appointment now →
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          💡 Act fast
        </p>
        <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
          <li>Slots fill within minutes — open the link immediately</li>
          <li>Have your V-number and BSN ready to complete the booking</li>
          <li>All four desk locations are checked: Amsterdam, Den Haag, Zwolle,
              's-Hertogenbosch</li>
        </ul>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        You're receiving this because you subscribed to IND appointment alerts on
        <a href="{settings.FRONTEND_URL}/dashboard"
           style="color:#4f46e5;text-decoration:none;">RelocationHub</a>.
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


def _send_reminder_email(email: str) -> bool:
    subject = "Reminder: check your IND appointment slots"
    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;
                padding:32px 24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;color:#1a1a1a;">
          Relocation<span style="color:#4f46e5;">Hub</span>
        </span>
      </div>
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;">
        IND Appointment Reminder
      </h2>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;">
        It's time to check for available IND appointment slots. Slots can appear
        and disappear quickly — checking regularly gives you the best chance.
      </p>
      <a href="{IND_BOOKING_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:10px;
                text-decoration:none;margin-bottom:24px;">
        Check slots now →
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          💡 Tips for finding slots
        </p>
        <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
          <li>Monday mornings often have new slots after the weekend</li>
          <li>Check again after 17:00 — cancellations happen end of business day</li>
          <li>Try all four desk locations: Amsterdam, Den Haag, Zwolle,
              's-Hertogenbosch</li>
          <li>Book immediately when you see a slot — they fill within minutes</li>
        </ul>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        You're receiving this because you subscribed to IND appointment reminders.
        <a href="{settings.FRONTEND_URL}/dashboard"
           style="color:#4f46e5;text-decoration:none;">Manage alerts</a>
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


class ReportSlotRequest(BaseModel):
    user_id: str


def _send_community_report_email(email: str) -> bool:
    subject = "A fellow user found IND slots — check now!"
    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;
                padding:32px 24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;color:#1a1a1a;">
          Relocation<span style="color:#4f46e5;">Hub</span>
        </span>
      </div>
      <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">
        🎉 Someone just found IND appointment slots!
      </h2>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;">
        A fellow RelocationHub user spotted available slots and flagged it for everyone.
        Check now — slots disappear within minutes.
      </p>
      <a href="{IND_BOOKING_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:10px;
                text-decoration:none;margin:0 0 24px;">
        Book appointment now →
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          💡 Act fast
        </p>
        <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
          <li>Slots fill within minutes — open the link immediately</li>
          <li>Have your V-number and BSN ready to complete the booking</li>
          <li>Try all four desks: Amsterdam, Den Haag, Zwolle, 's-Hertogenbosch</li>
        </ul>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        You're receiving this because you subscribed to IND appointment alerts on
        <a href="{settings.FRONTEND_URL}/dashboard"
           style="color:#4f46e5;text-decoration:none;">RelocationHub</a>.
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


@router.post("/ind-monitor/report-slot")
async def report_slot(body: ReportSlotRequest):
    """User self-reports finding a slot — immediately alerts all subscribers."""
    supabase = get_supabase()

    # Verify the reporter is an active subscriber
    sub = (
        supabase.table("ind_monitor_subscriptions")
        .select("email")
        .eq("user_id", body.user_id)
        .eq("active", True)
        .execute()
    )
    if not sub.data:
        raise HTTPException(status_code=403, detail="Must be subscribed to report slots")

    # Log to cache
    supabase.table("ind_monitor_cache").insert({
        "slots_available": True,
        "status_text": "Community report: user spotted available slots",
    }).execute()

    # Email all active subscribers except the reporter
    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email")
        .eq("active", True)
        .neq("user_id", body.user_id)
        .execute()
    )

    now = datetime.now(timezone.utc).isoformat()
    notified = 0
    for s in subs.data or []:
        if _send_community_report_email(s["email"]):
            supabase.table("ind_monitor_subscriptions").update(
                {"last_notified_at": now}
            ).eq("user_id", s["user_id"]).execute()
            notified += 1

    return {"reported": True, "notified": notified}


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

    available_slots = _check_oap_slots()
    slots_found = bool(available_slots)

    if slots_found:
        desks_str = " | ".join(
            f"{s['desk_name']} ({s['product_label']}, first: {s['first_date']})"
            for s in available_slots
        )
        status_text = f"SLOTS AVAILABLE: {desks_str}"
    else:
        proxy_active = bool(settings.SCRAPER_API_KEY)
        status_text = (
            "No slots available (checked all desks)"
            if proxy_active
            else "No slots checked — SCRAPER_API_KEY not set (reminder mode)"
        )

    supabase.table("ind_monitor_cache").insert({
        "slots_available": slots_found,
        "status_text": status_text,
    }).execute()

    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email, last_notified_at")
        .eq("active", True)
        .execute()
    )

    now = datetime.now(timezone.utc).isoformat()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=REMINDER_INTERVAL_HOURS)).isoformat()
    notified = 0

    for sub in subs.data or []:
        last = sub.get("last_notified_at")
        if slots_found:
            # Bypass rate limit — send immediately when slots are found
            if _send_slots_email(sub["email"], available_slots):
                supabase.table("ind_monitor_subscriptions").update(
                    {"last_notified_at": now}
                ).eq("user_id", sub["user_id"]).execute()
                notified += 1
        else:
            # Fallback: reminder every 8h when no slots detected
            if last and last > cutoff:
                continue
            if _send_reminder_email(sub["email"]):
                supabase.table("ind_monitor_subscriptions").update(
                    {"last_notified_at": now}
                ).eq("user_id", sub["user_id"]).execute()
                notified += 1

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

    return {
        "slots_found": slots_found,
        "available": available_slots,
        "notified": notified,
        "status": status_text,
    }
