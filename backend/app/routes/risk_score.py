import json
from datetime import date, datetime, timezone

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.routes.checklist import _check_and_increment_usage
from supabase import create_client

router = APIRouter()
_supabase = None
_claude = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def get_claude():
    global _claude
    if _claude is None:
        _claude = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _claude


class ComputeRiskScoreRequest(BaseModel):
    user_id: str


def _compute_dimension_scores(supabase, user_id: str, profile: dict) -> dict:
    tasks_res = supabase.table("tasks").select("category, status, due_date, priority").eq("user_id", user_id).execute()
    tasks = tasks_res.data or []

    docs_res = supabase.table("documents").select("id").eq("user_id", user_id).execute()
    doc_ids = [d["id"] for d in (docs_res.data or [])]

    # -- critical_completion (40%) --
    critical = [t for t in tasks if t["category"] == "critical"]
    total_critical = len(critical)
    completed_critical = sum(1 for t in critical if t["status"] == "completed")
    if total_critical > 0:
        critical_completion = round((completed_critical / total_critical) * 100)
    else:
        critical_completion = 100

    # -- timeline_feasibility (30%) --
    today = date.today()
    move_date_str = profile.get("move_date")
    if move_date_str:
        try:
            move_date = date.fromisoformat(move_date_str[:10])
            days_until_move = (move_date - today).days
        except ValueError:
            days_until_move = None
    else:
        days_until_move = None

    timeline_score = 100
    if days_until_move is not None:
        pending_tasks = [t for t in tasks if t["status"] == "pending"]
        for t in pending_tasks:
            if t.get("due_date"):
                try:
                    due = date.fromisoformat(t["due_date"][:10])
                    days_until_due = (due - today).days
                    if days_until_due < 0:
                        timeline_score -= 10  # overdue
                    elif days_until_due < 7:
                        timeline_score -= 5   # urgent
                except ValueError:
                    pass
        if days_until_move < 30 and len(pending_tasks) > 5:
            timeline_score -= 15
        timeline_score = max(0, timeline_score)
    else:
        timeline_score = 70  # unknown move date → moderate penalty

    # -- document_readiness (20%) --
    total_tasks = len(tasks)
    tasks_with_docs = 0
    if doc_ids and total_tasks > 0:
        task_ids_with_docs_res = (
            supabase.table("documents")
            .select("task_id")
            .eq("user_id", user_id)
            .execute()
        )
        unique_task_ids = {d["task_id"] for d in (task_ids_with_docs_res.data or []) if d.get("task_id")}
        tasks_with_docs = len(unique_task_ids)

    upload_rate = round((tasks_with_docs / total_tasks) * 100) if total_tasks > 0 else 0

    # Validation pass rate
    if doc_ids:
        val_res = (
            supabase.table("document_validations")
            .select("status")
            .eq("user_id", user_id)
            .execute()
        )
        validations = val_res.data or []
        total_validated = len(validations)
        passed = sum(1 for v in validations if v["status"] == "pass")
        validation_pass_rate = round((passed / total_validated) * 100) if total_validated > 0 else 50
    else:
        validation_pass_rate = 50  # no docs → neutral

    document_readiness = round(upload_rate * 0.3 + validation_pass_rate * 0.7)

    # -- profile_completeness (10%) --
    profile_score = 0
    if profile.get("move_date"):
        profile_score += 50
    if profile.get("contact_name") and profile.get("contact_email"):
        profile_score += 50

    return {
        "critical_completion": critical_completion,
        "timeline_feasibility": min(100, timeline_score),
        "document_readiness": document_readiness,
        "profile_completeness": profile_score,
    }


def _compute_overall_score(dims: dict) -> int:
    weights = {
        "critical_completion": 0.40,
        "timeline_feasibility": 0.30,
        "document_readiness": 0.20,
        "profile_completeness": 0.10,
    }
    return round(sum(dims[k] * w for k, w in weights.items()))


def _risk_level(score: int) -> str:
    if score >= 70:
        return "low"
    if score >= 40:
        return "med"
    return "high"


@router.post("/risk-score/compute")
async def compute_risk_score(body: ComputeRiskScoreRequest):
    supabase = get_supabase()

    profile_res = supabase.table("profiles").select("*").eq("id", body.user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = profile_res.data[0]

    if profile["tier"] != "paid":
        raise HTTPException(status_code=402, detail="paid_tier_required")
    if not profile["ai_validation_consent"]:
        raise HTTPException(status_code=400, detail="consent_required")

    _check_and_increment_usage(supabase, body.user_id, call_type="risk_score")

    dims = _compute_dimension_scores(supabase, body.user_id, profile)
    score = _compute_overall_score(dims)
    level = _risk_level(score)

    # Claude writes the human-readable risk items — no PII or document content passed
    system_prompt = (
        "You are a relocation risk analyst. Return ONLY valid JSON. "
        "Do not include any personal data, names, or document content in your response."
    )
    user_prompt = (
        f"A user relocating to the Netherlands has the following risk dimension scores:\n"
        f"- Critical task completion: {dims['critical_completion']}/100\n"
        f"- Timeline feasibility: {dims['timeline_feasibility']}/100\n"
        f"- Document readiness: {dims['document_readiness']}/100\n"
        f"- Profile completeness: {dims['profile_completeness']}/100\n"
        f"Overall score: {score}/100 ({level} risk)\n\n"
        "Based on these scores, identify the top 5 most important risk items the user should address. "
        "Return ONLY this JSON array — no other text:\n"
        "[\n"
        '  { "rank": 1, "category": "critical|timeline|documents|profile", '
        '"title": "<short title>", "detail": "<1-2 sentences>", "action": "<concrete next step>" }\n'
        "]"
    )

    try:
        claude = get_claude()
        message = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        risk_items = json.loads(raw)
    except Exception:
        risk_items = []

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "user_id": body.user_id,
        "score": score,
        "risk_level": level,
        "risk_items": risk_items,
        "dimension_scores": dims,
        "computed_at": now,
    }
    supabase.table("risk_scores").upsert(record, on_conflict="user_id").execute()

    return {
        "score": score,
        "risk_level": level,
        "risk_items": risk_items,
        "dimension_scores": dims,
        "computed_at": now,
    }


@router.get("/risk-score/{user_id}")
async def get_risk_score(user_id: str):
    supabase = get_supabase()
    result = supabase.table("risk_scores").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No risk score found")
    return result.data[0]
