from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
import stripe
from app.config import settings
from supabase import create_client

router = APIRouter()
_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _get_valid_promo(supabase, code: str) -> dict | None:
    """Returns promo code row if valid, None otherwise."""
    result = supabase.table("promo_codes").select("*").eq("code", code.upper()).execute()
    if not result.data:
        return None
    promo = result.data[0]
    if promo.get("max_uses") and promo["uses_count"] >= promo["max_uses"]:
        return None
    if promo.get("expires_at"):
        try:
            exp = datetime.fromisoformat(promo["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                return None
        except (ValueError, AttributeError):
            pass
    return promo


# ── Promo code validation (public) ───────────────────────────────────────────

@router.get("/billing/promo-code/{code}")
async def validate_promo_code(code: str):
    promo = _get_valid_promo(get_supabase(), code)
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid or expired promo code")
    return {"valid": True, "discount_percent": promo["discount_percent"], "code": promo["code"]}


# ── Admin: create promo / influencer code ────────────────────────────────────

class CreatePromoCodeRequest(BaseModel):
    code: str
    discount_percent: int
    type: str = "manual"
    referred_by_user_id: Optional[str] = None
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None


@router.post("/admin/promo-codes")
async def create_promo_code(
    body: CreatePromoCodeRequest,
    x_admin_secret: Optional[str] = Header(None, alias="x-admin-secret"),
):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    supabase = get_supabase()
    result = supabase.table("promo_codes").insert({
        "code": body.code.upper(),
        "discount_percent": body.discount_percent,
        "type": body.type,
        "referred_by_user_id": body.referred_by_user_id,
        "max_uses": body.max_uses,
        "expires_at": body.expires_at,
    }).execute()
    return {"created": True, "promo_code": result.data[0] if result.data else None}


@router.get("/admin/promo-codes")
async def list_promo_codes(
    x_admin_secret: Optional[str] = Header(None, alias="x-admin-secret"),
):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = get_supabase().table("promo_codes").select("*").order("created_at", desc=True).execute()
    return {"promo_codes": result.data or []}


# ── Checkout ──────────────────────────────────────────────────────────────────

class CreateCheckoutRequest(BaseModel):
    user_id: str
    email: str
    promo_code: Optional[str] = None


@router.post("/billing/create-checkout")
async def create_checkout(body: CreateCheckoutRequest):
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PRICE_ID:
        raise HTTPException(status_code=503, detail="Billing not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY

    discounts = []
    promo = None
    if body.promo_code:
        promo = _get_valid_promo(get_supabase(), body.promo_code)
        if promo:
            coupon_id = f"VALRYN_{promo['code']}"
            try:
                stripe.Coupon.retrieve(coupon_id)
            except stripe.error.InvalidRequestError:
                stripe.Coupon.create(
                    id=coupon_id,
                    percent_off=promo["discount_percent"],
                    duration="once",
                    name=f"{promo['code']} — {promo['discount_percent']}% off",
                )
            discounts = [{"coupon": coupon_id}]

    session_params: dict = {
        "mode": "payment",
        "payment_method_types": ["card"],
        "line_items": [{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        "customer_email": body.email,
        "metadata": {"user_id": body.user_id, "promo_code": promo["code"] if promo else ""},
        "success_url": f"{settings.FRONTEND_URL}/upgrade/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{settings.FRONTEND_URL}/dashboard",
    }
    if discounts:
        session_params["discounts"] = discounts

    session = stripe.checkout.Session.create(**session_params)
    return {"checkout_url": session.url}


def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        return
    promo_code = session.get("metadata", {}).get("promo_code") or ""
    sb = get_supabase()
    update_data: dict = {"tier": "paid"}
    if promo_code:
        update_data["referred_by_code"] = promo_code
    sb.table("profiles").update(update_data).eq("id", user_id).execute()
    if promo_code:
        promo_res = sb.table("promo_codes").select("uses_count").eq("code", promo_code).execute()
        if promo_res.data:
            sb.table("promo_codes").update(
                {"uses_count": promo_res.data[0]["uses_count"] + 1}
            ).eq("code", promo_code).execute()


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/billing/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None, alias="stripe-signature")):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        _handle_checkout_completed(event["data"]["object"])

    return {"received": True}
