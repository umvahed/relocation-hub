from typing import Annotated
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from app.config import settings
from app.deps import get_current_user_id, verify_admin_secret
from supabase import create_client
from datetime import datetime, timezone, timedelta

router = APIRouter()
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase

class OnboardingData(BaseModel):
    user_id: str
    email: str
    full_name: str
    origin_country: str
    move_date: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    origin_country: str | None = None
    move_date: str | None = None
    employment_type: str | None = None
    has_pets: bool | None = None
    shipping_type: str | None = None
    has_relocation_allowance: bool | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    destination_city: str | None = None
    has_children: bool | None = None
    number_of_children: int | None = None
    container_ship_date: str | None = None
    notify_by_email: bool | None = None
    has_partner: bool | None = None
    partner_full_name: str | None = None
    partner_email: str | None = None
    partner_origin_country: str | None = None
    # Expanded onboarding fields (migration 014)
    employer_arranges_permit: str | None = None   # 'employer' | 'self' | 'eu_citizen' | 'unsure'
    employer_is_sponsor: bool | None = None
    has_driving_licence: bool | None = None
    driving_licence_country: str | None = None
    children_school_stage: str | None = None       # 'primary' | 'secondary' | 'both' | 'preschool' | 'not_sure'
    expects_30_ruling: bool | None = None
    already_in_netherlands: bool | None = None

class ConsentUpdate(BaseModel):
    ai_validation_consent: bool

class GrantPaidTierRequest(BaseModel):
    user_id: str

@router.post("/auth/onboard")
async def onboard_user(data: OnboardingData, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != data.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        existing = supabase.table("profiles").select("id, trial_ends_at").eq("id", data.user_id).execute()
        is_new = not existing.data

        row: dict = {
            "id": data.user_id,
            "email": data.email,
            "full_name": data.full_name,
            "origin_country": data.origin_country,
            "destination_country": "Netherlands",
            "move_date": data.move_date or None,
            "contact_name": data.contact_name or None,
            "contact_email": data.contact_email or None,
        }
        if is_new:
            row["trial_ends_at"] = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        supabase.table("profiles").upsert(row, on_conflict="id").execute()

        return {"message": "Profile upserted", "user_id": data.user_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/auth/profile/{user_id}")
async def get_profile(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        result = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/auth/profile/{user_id}")
async def update_profile(user_id: str, data: ProfileUpdate, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        update_data = data.model_dump(exclude_unset=True)
        for key in ('move_date', 'contact_name', 'contact_email', 'destination_city',
                    'partner_full_name', 'partner_email', 'partner_origin_country',
                    'driving_licence_country', 'employer_arranges_permit', 'children_school_stage'):
            if key in update_data:
                update_data[key] = update_data[key] or None
        if not update_data:
            return {"message": "No changes"}
        supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        result = supabase.table("profiles").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else {"message": "Updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/auth/profile/{user_id}/consent")
async def update_consent(user_id: str, body: ConsentUpdate, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        update: dict = {"ai_validation_consent": body.ai_validation_consent}
        if body.ai_validation_consent:
            update["ai_validation_consent_at"] = datetime.now(timezone.utc).isoformat()
        supabase.table("profiles").update(update).eq("id", user_id).execute()
        return {"message": "Consent updated", "ai_validation_consent": body.ai_validation_consent}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/admin/grant-paid-tier", responses={403: {"description": "Invalid or missing admin secret"}})
async def grant_paid_tier(
    body: GrantPaidTierRequest,
    _: None = Depends(verify_admin_secret),
):
    try:
        supabase = get_supabase()
        supabase.table("profiles").update({
            "tier": "paid",
            "tier_granted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", body.user_id).execute()
        return {"message": "Paid tier granted", "user_id": body.user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/auth/profile/{user_id}")
async def delete_account(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()

        # Delete storage files first
        docs = supabase.table("documents").select("file_path").eq("user_id", user_id).execute()
        if docs.data:
            paths = [d["file_path"] for d in docs.data if d.get("file_path")]
            if paths:
                supabase.storage.from_("documents").remove(paths)

        # Delete all user data in order
        supabase.table("risk_scores").delete().eq("user_id", user_id).execute()
        supabase.table("documents").delete().eq("user_id", user_id).execute()
        supabase.table("tasks").delete().eq("user_id", user_id).execute()
        supabase.table("api_usage").delete().eq("user_id", user_id).execute()
        supabase.table("profiles").delete().eq("id", user_id).execute()

        # Delete auth user (requires service key)
        supabase.auth.admin.delete_user(user_id)

        return {"message": "Account deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
