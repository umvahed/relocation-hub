from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from supabase import create_client

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

@router.post("/auth/onboard")
async def onboard_user(data: OnboardingData):
    try:
        supabase = get_supabase()
        supabase.table("profiles").upsert({
            "id": data.user_id,
            "email": data.email,
            "full_name": data.full_name,
            "origin_country": data.origin_country,
            "destination_country": "Netherlands",
            "move_date": data.move_date,
        }, on_conflict="id").execute()

        return {"message": "Profile upserted", "user_id": data.user_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/auth/profile/{user_id}")
async def get_profile(user_id: str):
    try:
        supabase = get_supabase()
        result = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))