from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from supabase import create_client
import anthropic
import json

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

class GenerateChecklistRequest(BaseModel):
    user_id: str
    origin_country: str
    destination_country: str = "Netherlands"
    move_date: str | None = None
    employment_type: str = "employed"

@router.post("/checklist/generate")
async def generate_checklist(request: GenerateChecklistRequest):
    try:
        supabase = get_supabase()
        claude = get_claude()
        existing = supabase.table("tasks").select("id").eq("user_id", request.user_id).execute()
        if existing.data:
            return {"message": "Checklist already exists", "tasks": existing.data}

        prompt = f"""You are a relocation expert. Generate a detailed relocation checklist for someone moving from {request.origin_country} to {request.destination_country}.

Employment type: {request.employment_type}
Move date: {request.move_date or "Not specified"}

Return ONLY a JSON array of tasks. No other text. Each task must have:
- title: string
- description: string
- category: one of [visa, housing, banking, employment, healthcare, transport, admin, shipping]
- priority: integer 1-10 (10 = most urgent)
- estimated_days: integer (days before move this should be done)
- external_link: string or null (official government/institution URL)

Include these critical NL-specific tasks:
- MVV visa application (if required)
- IND appointment
- BSN number registration
- DigiD application
- Municipal registration (gemeente)
- Dutch bank account (bunq or ING)
- Health insurance (zorgverzekering)
- Housing search
- Shipping/moving company
- Flight booking

Generate 20-25 tasks total. Return ONLY valid JSON array."""

        message = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        tasks_json = message.content[0].text.strip()
        if tasks_json.startswith("```"):
            tasks_json = tasks_json.split("```")[1]
            if tasks_json.startswith("json"):
                tasks_json = tasks_json[4:]

        tasks = json.loads(tasks_json)

        tasks_to_insert = []
        for task in tasks:
            tasks_to_insert.append({
                "user_id": request.user_id,
                "title": task["title"],
                "description": task.get("description", ""),
                "category": task.get("category", "admin"),
                "priority": task.get("priority", 5),
                "status": "pending",
                "external_link": task.get("external_link"),
            })

        result = supabase.table("tasks").insert(tasks_to_insert).execute()
        return {"message": "Checklist generated", "task_count": len(result.data), "tasks": result.data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/checklist/{user_id}")
async def get_checklist(user_id: str):
    try:
        supabase = get_supabase()
        result = supabase.table("tasks").select("*").eq("user_id", user_id).order("priority", desc=True).execute()
        return {"tasks": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/checklist/task/{task_id}")
async def update_task(task_id: str, status: str):
    try:
        supabase = get_supabase()
        result = supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
        return {"message": "Task updated", "task": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
