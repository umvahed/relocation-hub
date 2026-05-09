from fastapi import APIRouter, HTTPException
from supabase import create_client

from app.config import settings

router = APIRouter()
_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


@router.get("/share/{token}")
async def get_share_data(token: str):
    """Public endpoint — no auth. Returns sanitised progress data for the shareable link."""
    sb = get_supabase()

    profile_res = sb.table("profiles").select(
        "id, full_name, origin_country, destination_city, move_date"
    ).eq("share_token", token).single().execute()

    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Share link not found")

    p = profile_res.data
    user_id = p["id"]

    # Tasks summary
    tasks_res = sb.table("tasks").select("category, status").eq("user_id", user_id).execute()
    tasks = tasks_res.data or []

    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == "completed")

    by_category: dict[str, dict] = {}
    for t in tasks:
        cat = t.get("category", "other")
        if cat not in by_category:
            by_category[cat] = {"total": 0, "completed": 0}
        by_category[cat]["total"] += 1
        if t.get("status") == "completed":
            by_category[cat]["completed"] += 1

    # Risk score (optional — only if computed)
    risk_res = sb.table("risk_scores").select("score, risk_level").eq("user_id", user_id).order("computed_at", desc=True).limit(1).execute()
    risk = risk_res.data[0] if risk_res.data else None

    # Document count
    docs_res = sb.table("documents").select("id", count="exact").eq("user_id", user_id).execute()
    docs_count = docs_res.count or 0

    return {
        "full_name": p.get("full_name"),
        "origin_country": p.get("origin_country"),
        "destination_city": p.get("destination_city"),
        "move_date": p.get("move_date"),
        "tasks": {"total": total, "completed": completed, "by_category": by_category},
        "risk": risk,
        "docs_count": docs_count,
    }
