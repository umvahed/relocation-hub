from typing import Annotated
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx
import asyncio
from datetime import datetime, timezone
from app.config import settings
from app.routes.notifications import _send_email
from supabase import create_client

router = APIRouter()
_supabase = None

IND_OAP_API = "https://oap.ind.nl/oap/api/desks"
IND_BOOKING_URL = "https://oap.ind.nl/oap/en/#/doc"
IND_DESKS = {
    "AM": "Amsterdam",
    "DH": "Den Haag",
    "ZW": "Zwolle",
    "DB": "'s-Hertogenbosch",
}
# OAP blocks all data-centre IPs (Railway, Vercel, etc.) — requests must come from residential IPs.
# We route through ScraperAPI (scraperapi.com) which uses residential proxy pools.
# Free tier: 1000 req/month. At 4 desks × 2 keys × 6 checks/day = 720 req/month — within limit.
PRODUCT_KEYS = ("TKV", "DOC")

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
    "Referer": "https://oap.ind.nl/oap/en/",
    "Origin": "https://oap.ind.nl",
}

SCRAPER_API_BASE = "https://api.scraperapi.com"


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _extract_slots(data) -> bool:
    """Return True if the response body contains at least one slot, regardless of shape."""
    if isinstance(data, list):
        return len(data) > 0
    if isinstance(data, dict):
        # Some API versions wrap in {"data": [...]} or {"slots": [...]}
        for key in ("data", "slots", "dates", "results"):
            val = data.get(key)
            if isinstance(val, list) and len(val) > 0:
                return True
    return False


class SubscribeRequest(BaseModel):
    user_id: str
    email: str


def _oap_url(desk: str, product_key: str) -> str:
    target = f"{IND_OAP_API}/{desk}/slots/?productKey={product_key}&persons=1"
    if settings.SCRAPER_API_KEY:
        from urllib.parse import quote
        # premium=true: use ScraperAPI's high-trust residential pool for anti-bot protected sites.
        # oap.ind.nl rejects standard proxies (500/no credits); premium bypasses that.
        # Costs 10 credits/request vs 1 — free tier has 1000 credits = 100 premium calls.
        return f"{SCRAPER_API_BASE}?api_key={settings.SCRAPER_API_KEY}&url={quote(target)}&premium=true&country_code=nl"
    return target


def _oap_url_safe(desk: str, product_key: str) -> str:
    """Same as _oap_url but with API key masked — for logging/debug output."""
    url = _oap_url(desk, product_key)
    if settings.SCRAPER_API_KEY:
        return url.replace(settings.SCRAPER_API_KEY, "***")  # type: ignore[arg-type]
    return url


async def _query_slots(client: httpx.AsyncClient, desk: str, product_key: str) -> tuple[int, any]:
    url = _oap_url(desk, product_key)
    # When routing through ScraperAPI, send no custom headers — their endpoint
    # rejects requests with a foreign Origin header (returns 500, no credits deducted).
    # ScraperAPI applies its own browser headers to the proxied OAP request.
    headers = {} if settings.SCRAPER_API_KEY else BROWSER_HEADERS
    resp = await client.get(url, headers=headers, timeout=90)
    try:
        data = resp.json()
    except Exception:
        data = None
    return resp.status_code, data


async def _fetch_ind_status() -> tuple[bool, str]:
    """Query OAP for each desk via ScraperAPI (residential IPs). Returns (slots_available, status_text)."""
    available_desks: list[str] = []
    errors: list[str] = []

    async with httpx.AsyncClient(timeout=100, follow_redirects=True) as client:
        for i, (code, name) in enumerate(IND_DESKS.items()):
            if i > 0:
                await asyncio.sleep(3)  # pause between desks — avoids OAP rate-limiting (429)
            for product_key in PRODUCT_KEYS:
                try:
                    status, data = await _query_slots(client, code, product_key)
                    if status == 200 and data is not None and _extract_slots(data):
                        available_desks.append(f"{name} ({product_key})")
                        break
                    elif status == 200 and data is not None:
                        break  # 200 empty = valid key, no slots — no need to try next key
                    elif status == 429:
                        # Rate-limited — wait and retry once
                        await asyncio.sleep(10)
                        status2, data2 = await _query_slots(client, code, product_key)
                        if status2 == 200 and data2 is not None and _extract_slots(data2):
                            available_desks.append(f"{name} ({product_key})")
                            break
                        elif status2 == 200 and data2 is not None:
                            break
                        else:
                            errors.append(f"{code}/{product_key}: rate-limited (429)")
                    elif status not in (400, 404):
                        errors.append(f"{code}/{product_key}: HTTP {status}")
                except Exception as exc:
                    errors.append(f"{code}/{product_key}: {type(exc).__name__}: {exc}")

    if available_desks:
        return True, f"Slots available at: {', '.join(available_desks)}"
    if errors:
        return False, f"No slots found (errors: {'; '.join(errors[:5])})"
    return False, "No slots currently available at any IND desk"


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
        {'<p style="font-size: 13px; color: #374151; margin: 8px 0 0;">Book your appointment at <a href="' + IND_BOOKING_URL + '" style="color: #4f46e5;">oap.ind.nl</a> before slots fill up again.</p>' if slots_available else ''}
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


@router.get("/ind-monitor/debug")
async def debug_ind(authorization: Annotated[str | None, Header()] = None):
    """Raw diagnostic probe — connectivity test + 1 desk check."""
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")

    connectivity: dict = {}
    results = []

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        # Step 1: verify Railway can reach ScraperAPI at all using a known-good URL
        if settings.SCRAPER_API_KEY:
            from urllib.parse import quote
            test_url = (
                f"{SCRAPER_API_BASE}?api_key={settings.SCRAPER_API_KEY}"
                f"&url={quote('https://httpbin.org/json')}"
            )
            try:
                r = await client.get(test_url, timeout=20)
                connectivity["scraperapi_reachable"] = True
                connectivity["test_status"] = r.status_code
            except Exception as exc:
                connectivity["scraperapi_reachable"] = False
                connectivity["test_error"] = f"{type(exc).__name__}: {exc}"

        # Step 2: probe just Amsterdam with one key
        for product_key in PRODUCT_KEYS[:1]:
            entry: dict = {
                "desk": "AM",
                "product_key": product_key,
                "url": _oap_url_safe("AM", product_key),
            }
            try:
                status, body = await _query_slots(client, "AM", product_key)
                entry["status"] = status
                if isinstance(body, list):
                    entry["body_type"] = "list"
                    entry["count"] = len(body)
                    entry["sample"] = body[:2]
                elif isinstance(body, dict):
                    entry["body_type"] = "dict"
                    entry["keys"] = list(body.keys())[:10]
                else:
                    entry["body_type"] = type(body).__name__
            except Exception as exc:
                entry["error"] = f"{type(exc).__name__}: {exc}"
            results.append(entry)

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "scraper_api_configured": bool(settings.SCRAPER_API_KEY),
        "connectivity": connectivity,
        "results": results,
    }


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
