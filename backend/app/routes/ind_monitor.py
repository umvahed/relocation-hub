from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import json
import logging
from urllib.parse import quote
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

logger = logging.getLogger(__name__)

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

REMINDER_INTERVAL_HOURS = 4
SCRAPER_API_ENDPOINT = "https://api.scraperapi.com/"

# Maps lowercased city names to the nearest IND desk code.
# Default (unknown city): DH (IND headquarters is in Den Haag).
CITY_TO_DESK: dict[str, str] = {
    # Amsterdam desk — Noord-Holland, Flevoland, Utrecht
    "amsterdam": "AM", "haarlem": "AM", "alkmaar": "AM", "almere": "AM",
    "zaandam": "AM", "amstelveen": "AM", "hilversum": "AM", "lelystad": "AM",
    "utrecht": "AM",
    # Den Haag desk — Zuid-Holland
    "den haag": "DH", "the hague": "DH", "'s-gravenhage": "DH",
    "rotterdam": "DH", "delft": "DH", "leiden": "DH", "zoetermeer": "DH",
    "dordrecht": "DH", "gouda": "DH", "schiedam": "DH",
    # Zwolle desk — Noord- and Oost-Nederland
    "zwolle": "ZW", "groningen": "ZW", "enschede": "ZW", "arnhem": "ZW",
    "apeldoorn": "ZW", "deventer": "ZW", "leeuwarden": "ZW", "nijmegen": "ZW",
    "assen": "ZW",
    # 's-Hertogenbosch desk — Zuid-Nederland
    "'s-hertogenbosch": "DB", "den bosch": "DB", "eindhoven": "DB",
    "tilburg": "DB", "breda": "DB", "maastricht": "DB", "venlo": "DB",
    "hertogenbosch": "DB",
}


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


class SubscribeRequest(BaseModel):
    user_id: str
    email: str


def _city_to_desk(city: str) -> str:
    return CITY_TO_DESK.get(city.lower().strip(), "DH")


def _scraper_url(target: str) -> Optional[str]:
    """
    Wraps a target URL in ScraperAPI URL mode — a plain HTTPS GET to api.scraperapi.com.
    Returns None if SCRAPER_API_KEY is not set.
    """
    key = settings.SCRAPER_API_KEY
    if not key:
        return None
    return f"{SCRAPER_API_ENDPOINT}?api_key={key}&url={quote(target, safe='')}&country_code=nl"


def _parse_oap_response(text: str) -> list:
    """Strips the while(...) anti-CSRF wrapper and parses OAP JSON."""
    text = text.strip()
    if text.startswith("while("):
        text = text[6:]
        if text.endswith(")"):
            text = text[:-1]
    return json.loads(text).get("data") or []


def _check_oap_slots() -> list[dict]:
    """
    Queries OAP for TKV (biometrics) slots at all 4 desks.
    Returns one result per desk: {desk_code, desk_name, first_date|None, slot_count, checked}.
    checked=False means the API call failed for that desk.
    Returns [] if ScraperAPI is not configured.
    """
    if not settings.SCRAPER_API_KEY:
        return []

    import requests as req_lib

    results = []
    for desk in DESKS:
        oap_url = (
            f"{IND_OAP_BASE}/oap/api/desks/{desk['code']}/slots/"
            f"?productKey=TKV&persons=1"
        )
        fetch_url = _scraper_url(oap_url)
        try:
            r = req_lib.get(fetch_url, timeout=30)
            if r.status_code != 200:
                logger.warning("OAP %s returned HTTP %s", desk["code"], r.status_code)
                results.append({
                    "desk_code": desk["code"],
                    "desk_name": desk["name"],
                    "first_date": None,
                    "slot_count": 0,
                    "checked": False,
                })
                continue
            slots = _parse_oap_response(r.text)
            logger.info("OAP %s: %s slot(s)", desk["code"], len(slots))
            results.append({
                "desk_code": desk["code"],
                "desk_name": desk["name"],
                "first_date": slots[0].get("date") if slots else None,
                "slot_count": len(slots),
                "checked": True,
            })
        except Exception as e:
            logger.warning("OAP %s request failed: %s", desk["code"], e)
            results.append({
                "desk_code": desk["code"],
                "desk_name": desk["name"],
                "first_date": None,
                "slot_count": 0,
                "checked": False,
            })

    return results


def _send_slots_email(email: str, slots: list[dict]) -> bool:
    subject = "IND appointment slots are available — book now!"

    slots_html = "".join(
        f"""
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                    padding:12px 16px;margin-bottom:8px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
            {s['desk_name']} — Residence permit biometrics
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
        IND appointment slots are available!
      </h2>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;">
        We found open slots — book immediately before they disappear.
      </p>
      {slots_html}
      <a href="{IND_BOOKING_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:10px;
                text-decoration:none;margin:16px 0 24px;">
        Book appointment now
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          Act fast
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
        Check slots now
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          Tips for finding slots
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
        Someone just found IND appointment slots!
      </h2>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;">
        A fellow RelocationHub user spotted available slots and flagged it for everyone.
        Check now — slots disappear within minutes.
      </p>
      <a href="{IND_BOOKING_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:10px;
                text-decoration:none;margin:0 0 24px;">
        Book appointment now
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
          Act fast
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

    sub = (
        supabase.table("ind_monitor_subscriptions")
        .select("email")
        .eq("user_id", body.user_id)
        .eq("active", True)
        .execute()
    )
    if not sub.data:
        raise HTTPException(status_code=403, detail="Must be subscribed to report slots")

    supabase.table("ind_monitor_cache").insert({
        "slots_available": True,
        "status_text": "Community report: user spotted available slots",
        "slot_data": [],
    }).execute()

    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email")
        .eq("active", True)
        .neq("user_id", body.user_id)
        .execute()
    )

    notify_prefs = _fetch_notify_prefs(supabase, [s["user_id"] for s in subs.data or []])
    now = datetime.now(timezone.utc).isoformat()
    notified = 0
    for s in subs.data or []:
        if not notify_prefs.get(s["user_id"], True):
            continue
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


@router.get("/ind-monitor/slots")
async def get_slots(city: Optional[str] = None):
    """
    Public endpoint — returns per-desk TKV slot availability from the last cache entry.
    Accepts optional city param to identify the nearest desk.
    """
    supabase = get_supabase()
    nearest_code = _city_to_desk(city) if city else "DH"
    nearest_desk = next((d for d in DESKS if d["code"] == nearest_code), DESKS[1])

    latest = (
        supabase.table("ind_monitor_cache")
        .select("slot_data, checked_at, slots_available")
        .order("checked_at", desc=True)
        .limit(1)
        .execute()
    )

    if not latest.data:
        return {
            "nearest_desk": nearest_desk,
            "desks": [],
            "last_checked": None,
            "scraper_active": bool(settings.SCRAPER_API_KEY),
        }

    entry = latest.data[0]
    return {
        "nearest_desk": nearest_desk,
        "desks": entry.get("slot_data") or [],
        "last_checked": entry.get("checked_at"),
        "scraper_active": bool(settings.SCRAPER_API_KEY),
    }


def _build_status_text(slots_found: bool, available_slots: list) -> str:
    if slots_found:
        desks_str = " | ".join(
            f"{s['desk_name']} (first: {s['first_date']})"
            for s in available_slots
        )
        return f"SLOTS AVAILABLE: {desks_str}"
    proxy_active = bool(settings.SCRAPER_API_KEY)
    return (
        "No slots available (checked all desks)"
        if proxy_active
        else "No slots checked — SCRAPER_API_KEY not set (reminder mode)"
    )


def _fetch_notify_prefs(supabase, user_ids: list) -> dict:
    if not user_ids:
        return {}
    res = supabase.table("profiles").select("id, notify_by_email").in_("id", user_ids).execute()
    return {p["id"]: p.get("notify_by_email", True) for p in (res.data or [])}


def _notify_subscriber(
    supabase, sub: dict, slots_found: bool, available_slots: list, now: str, cutoff: str
) -> bool:
    """Sends a slots or reminder email. Returns True if sent and timestamp updated."""
    if slots_found:
        if not _send_slots_email(sub["email"], available_slots):
            return False
    else:
        last = sub.get("last_notified_at")
        if last and last > cutoff:
            return False
        if not _send_reminder_email(sub["email"]):
            return False
    supabase.table("ind_monitor_subscriptions").update(
        {"last_notified_at": now}
    ).eq("user_id", sub["user_id"]).execute()
    return True


def _prune_cache(supabase) -> None:
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


@router.post("/ind-monitor/check")
async def check_ind(authorization: Annotated[str | None, Header()] = None):
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")

    supabase = get_supabase()

    all_desk_results = _check_oap_slots()
    available_slots = [d for d in all_desk_results if d.get("slot_count", 0) > 0]
    slots_found = bool(available_slots)
    status_text = _build_status_text(slots_found, available_slots)

    supabase.table("ind_monitor_cache").insert({
        "slots_available": slots_found,
        "status_text": status_text,
        "slot_data": all_desk_results,
    }).execute()

    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email, last_notified_at")
        .eq("active", True)
        .execute()
    )

    notify_prefs = _fetch_notify_prefs(supabase, [s["user_id"] for s in subs.data or []])
    now = datetime.now(timezone.utc).isoformat()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=REMINDER_INTERVAL_HOURS)).isoformat()
    notified = 0

    for sub in subs.data or []:
        if not notify_prefs.get(sub["user_id"], True):
            continue
        if _notify_subscriber(supabase, sub, slots_found, available_slots, now, cutoff):
            notified += 1

    _prune_cache(supabase)

    return {
        "slots_found": slots_found,
        "available": available_slots,
        "notified": notified,
        "status": status_text,
    }
