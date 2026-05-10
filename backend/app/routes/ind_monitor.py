from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import logging
from datetime import datetime, timezone
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter()
_supabase = None

IND_BOOKING_URL = "https://oap.ind.nl/oap/en/#/doc"

DESKS = [
    {"code": "AM", "name": "Amsterdam"},
    {"code": "DH", "name": "Den Haag"},
    {"code": "ZW", "name": "Zwolle"},
    {"code": "DB", "name": "'s-Hertogenbosch"},
]

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

DESK_ADDRESSES: dict[str, str] = {
    "AM": "Entrance F, De Entree 71, 1101 BH Amsterdam",
    "DH": "Rijnstraat 8, 2515 XP Den Haag",
    "ZW": "Dokterspad 1, 8011 PP Zwolle",
    "DB": "Pettelaarpark 1, 5216 PP 's-Hertogenbosch",
}

WHAT_TO_BRING_HTML = """
<ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:2;">
  <li>Valid passport or travel document</li>
  <li>V-number (on your IND permit letter or existing residence permit)</li>
  <li>Appointment confirmation email from IND</li>
  <li>Arrive 10 minutes early</li>
</ul>
"""


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _city_to_desk(city: str) -> str:
    return CITY_TO_DESK.get(city.lower().strip(), "DH")


def _is_exception_period(dt: datetime) -> bool:
    """Returns True during IND holiday period (Nov 24 – Jan 7) — Monday reset is skipped."""
    month, day = dt.month, dt.day
    return (month == 11 and day >= 24) or month == 12 or (month == 1 and day <= 7)


def _fetch_notify_prefs(supabase, user_ids: list) -> dict:
    if not user_ids:
        return {}
    res = supabase.table("profiles").select("id, notify_by_email").in_("id", user_ids).execute()
    return {p["id"]: p.get("notify_by_email", True) for p in (res.data or [])}


# ── Subscribe / unsubscribe ───────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    user_id: str
    email: str


@router.post("/ind-monitor/subscribe")
async def subscribe(body: SubscribeRequest):
    supabase = get_supabase()
    try:
        supabase.table("ind_monitor_subscriptions").upsert(
            {
                "user_id": body.user_id,
                "email": body.email,
                "active": True,
                "user_slots_available": True,
            },
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
            .select("active, last_notified_at, created_at, user_slots_available")
            .eq("user_id", user_id)
            .execute()
        )
        return {
            "subscribed": bool(sub.data and sub.data[0]["active"]),
            "subscription": sub.data[0] if sub.data else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Personal slot flag ────────────────────────────────────────────────────────

class ReportNoSlotsRequest(BaseModel):
    user_id: str


@router.post("/ind-monitor/report-no-slots")
async def report_no_slots(body: ReportNoSlotsRequest):
    """User checked OAP and found no slots — flips their personal availability flag to false."""
    supabase = get_supabase()
    sub = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id")
        .eq("user_id", body.user_id)
        .eq("active", True)
        .execute()
    )
    if not sub.data:
        raise HTTPException(status_code=403, detail="Must be subscribed to report")
    supabase.table("ind_monitor_subscriptions").update(
        {"user_slots_available": False}
    ).eq("user_id", body.user_id).execute()
    return {"reported": True}


# ── Weekly reset (Monday cron via GitHub Actions) ─────────────────────────────

def _send_weekly_reset_email(email: str) -> bool:
    subject = "IND appointment slots are available — check now!"
    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;">Relocation<span style="color:#4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">New week — IND slots are available!</h2>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;">
        It's a new week. IND appointment slots are available — check now and book before they're gone.
      </p>
      <a href="{IND_BOOKING_URL}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
        Check slots now
      </a>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Tips</p>
        <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
          <li>Monday mornings often have fresh availability</li>
          <li>Check all four desks — Amsterdam, Den Haag, Zwolle, 's-Hertogenbosch</li>
          <li>Book immediately when you see a slot — they go in minutes</li>
        </ul>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        <a href="{settings.FRONTEND_URL}/dashboard" style="color:#4f46e5;text-decoration:none;">Manage alerts</a>
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


@router.post("/ind-monitor/weekly-reset")
async def weekly_reset(authorization: Annotated[str | None, Header()] = None):
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")

    now_dt = datetime.now(timezone.utc)
    if _is_exception_period(now_dt):
        logger.info("Weekly reset skipped — exception period (Nov 24 – Jan 7)")
        return {"skipped": True, "reason": "exception_period"}

    supabase = get_supabase()
    now = now_dt.isoformat()

    # Reset all active subscribers' personal flag back to available
    supabase.table("ind_monitor_subscriptions").update(
        {"user_slots_available": True}
    ).eq("active", True).execute()

    subs = (
        supabase.table("ind_monitor_subscriptions")
        .select("user_id, email")
        .eq("active", True)
        .execute()
    )
    notify_prefs = _fetch_notify_prefs(supabase, [s["user_id"] for s in subs.data or []])
    notified = 0
    for s in subs.data or []:
        if not notify_prefs.get(s["user_id"], True):
            continue
        if _send_weekly_reset_email(s["email"]):
            supabase.table("ind_monitor_subscriptions").update(
                {"last_notified_at": now}
            ).eq("user_id", s["user_id"]).execute()
            notified += 1

    logger.info("Weekly reset done — notified=%s", notified)
    return {"reset": True, "notified": notified}


# ── User appointment bookings ─────────────────────────────────────────────────

class AppointmentRequest(BaseModel):
    user_id: str
    desk_code: str
    desk_name: str
    appointment_date: str  # YYYY-MM-DD


@router.post("/ind-monitor/appointment")
async def save_appointment(body: AppointmentRequest):
    supabase = get_supabase()
    supabase.table("ind_appointments").upsert(
        {
            "user_id": body.user_id,
            "desk_code": body.desk_code,
            "desk_name": body.desk_name,
            "appointment_date": body.appointment_date,
            "reminder_sent_7d": False,
            "reminder_sent_1d": False,
        },
        on_conflict="user_id",
    ).execute()
    # Unsubscribe from slot alerts — no longer needed once booked
    supabase.table("ind_monitor_subscriptions").update({"active": False}).eq(
        "user_id", body.user_id
    ).execute()
    return {"saved": True}


@router.get("/ind-monitor/appointment/{user_id}")
async def get_appointment(user_id: str):
    supabase = get_supabase()
    res = supabase.table("ind_appointments").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None


@router.delete("/ind-monitor/appointment/{user_id}")
async def delete_appointment(user_id: str):
    supabase = get_supabase()
    supabase.table("ind_appointments").delete().eq("user_id", user_id).execute()
    return {"deleted": True}


# ── Appointment reminders (daily cron via cron-job.org) ───────────────────────

def _send_appointment_reminder_email(
    email: str, desk_code: str, desk_name: str, appointment_date: str, days: int
) -> bool:
    from datetime import date as date_type
    d = date_type.fromisoformat(appointment_date)
    formatted = d.strftime("%-d %B %Y") if hasattr(d, "strftime") else appointment_date
    address = DESK_ADDRESSES.get(desk_code, "")

    subject = (
        "IND appointment tomorrow — what to bring"
        if days <= 1
        else f"IND appointment in {days} days — what to bring"
    )
    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;">Relocation<span style="color:#4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">
        {"Your IND appointment is tomorrow!" if days <= 1 else f"IND appointment in {days} days"}
      </h2>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">📅 {formatted} · {desk_name}</p>
        {"<p style='margin:4px 0 0;font-size:13px;color:#374151;'>📍 " + address + "</p>" if address else ""}
      </div>
      <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">What to bring:</p>
      {WHAT_TO_BRING_HTML}
      <p style="color:#9ca3af;font-size:13px;margin:16px 0 0;">
        <a href="{settings.FRONTEND_URL}/dashboard" style="color:#4f46e5;text-decoration:none;">View your dashboard</a>
      </p>
    </div>
    """
    return _send_email(to=email, subject=subject, html=html)


@router.post("/ind-monitor/send-appointment-reminders")
async def send_appointment_reminders(authorization: Annotated[str | None, Header()] = None):
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")
    from datetime import date as date_type
    supabase = get_supabase()
    today = date_type.today()
    sent_7d = sent_1d = 0

    appointments = supabase.table("ind_appointments").select(
        "user_id, desk_code, desk_name, appointment_date, reminder_sent_7d, reminder_sent_1d"
    ).execute()

    for appt in appointments.data or []:
        appt_date = date_type.fromisoformat(appt["appointment_date"])
        days_until = (appt_date - today).days
        if days_until < 0:
            continue

        profile = supabase.table("profiles").select("email").eq("id", appt["user_id"]).execute()
        if not profile.data:
            continue
        email = profile.data[0]["email"]

        if days_until == 7 and not appt["reminder_sent_7d"]:
            if _send_appointment_reminder_email(
                email, appt["desk_code"], appt["desk_name"], appt["appointment_date"], 7
            ):
                supabase.table("ind_appointments").update({"reminder_sent_7d": True}).eq(
                    "user_id", appt["user_id"]
                ).execute()
                sent_7d += 1

        if days_until == 1 and not appt["reminder_sent_1d"]:
            if _send_appointment_reminder_email(
                email, appt["desk_code"], appt["desk_name"], appt["appointment_date"], 1
            ):
                supabase.table("ind_appointments").update({"reminder_sent_1d": True}).eq(
                    "user_id", appt["user_id"]
                ).execute()
                sent_1d += 1

    return {"sent_7d": sent_7d, "sent_1d": sent_1d}
