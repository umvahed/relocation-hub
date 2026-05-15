from datetime import datetime, timezone
from fastapi import HTTPException


def is_paid_or_trial(profile: dict) -> bool:
    if profile.get("tier") == "paid":
        return True
    trial_ends_at = profile.get("trial_ends_at")
    if trial_ends_at:
        try:
            expires = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
            return expires > datetime.now(timezone.utc)
        except (ValueError, AttributeError):
            pass
    return False


def check_paid_tier(supabase, user_id: str) -> None:
    """Raises HTTP 402 if user is not on paid tier or active trial."""
    profile_res = supabase.table("profiles").select("tier, trial_ends_at").eq("id", user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not is_paid_or_trial(profile_res.data[0]):
        raise HTTPException(status_code=402, detail="Upgrade required")
