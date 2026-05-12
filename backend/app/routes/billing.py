from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
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


class CreateCheckoutRequest(BaseModel):
    user_id: str
    email: str


@router.post("/billing/create-checkout")
async def create_checkout(body: CreateCheckoutRequest):
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PRICE_ID:
        raise HTTPException(status_code=503, detail="Billing not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        customer_email=body.email,
        metadata={"user_id": body.user_id},
        success_url=f"{settings.FRONTEND_URL}/upgrade/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/dashboard",
    )
    return {"checkout_url": session.url}


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
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            get_supabase().table("profiles").update({"tier": "paid"}).eq("user_id", user_id).execute()

    return {"received": True}
