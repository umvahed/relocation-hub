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
    has_pets: bool = False
    shipping_type: str = "luggage_only"  # "container", "luggage_only"
    has_relocation_allowance: bool = False

@router.post("/checklist/generate")
async def generate_checklist(request: GenerateChecklistRequest):
    try:
        supabase = get_supabase()
        claude = get_claude()
        existing = supabase.table("tasks").select("id").eq("user_id", request.user_id).execute()
        if existing.data:
            return {"message": "Checklist already exists", "tasks": existing.data}

        conditional_notes = []
        if request.has_pets:
            conditional_notes.append("- The user is bringing pets — include pet import permit, veterinary health certificate, microchip/vaccination records, and airline pet policy tasks.")
        if request.shipping_type == "container":
            conditional_notes.append("- The user is shipping a full container — include packing inventory, container booking, customs declaration, port of entry clearance, and delivery coordination tasks.")
        else:
            conditional_notes.append("- The user is bringing luggage only — include a task to decide what to sell/donate/store, and baggage allowance planning.")
        if request.has_relocation_allowance:
            conditional_notes.append("- The user has an employer relocation/housing allowance — include tasks to confirm allowance amount, understand tax implications of the allowance, and submit expense claims.")

        conditional_block = "\n".join(conditional_notes) if conditional_notes else ""

        prompt = f"""You are a senior relocation expert specialising in moves to the Netherlands. Generate a precise, correctly-sequenced relocation checklist for someone moving from {request.origin_country} to the Netherlands.

User profile:
- Employment type: {request.employment_type}
- Move date: {request.move_date or "Not specified"}
- Shipping: {request.shipping_type}
- Has pets: {request.has_pets}
- Has employer relocation allowance: {request.has_relocation_allowance}

{conditional_block}

CRITICAL SEQUENCING RULES — follow this order exactly:

PRE-ARRIVAL (immigration & documents first):
1. Confirm with employer that they are a recognised IND sponsor
2. Employer submits knowledge migrant application to IND
3. Obtain apostilled documents (birth certificate, marriage certificate if applicable, police clearance, qualifications)
4. Book and attend consulate/VFS appointment to obtain MVV entry visa (required before travelling to NL — for South Africans this is done via VFS Global)
5. Complete antecedents declaration form (for family members — their residence permits follow after 3 months)
6. Book flight to Netherlands
7. Arrange temporary accommodation for first 1-3 months (Airbnb, short-stay, serviced apartment — NOT permanent housing yet)

PRE-ARRIVAL (logistics):
8. Ship container or arrange luggage (based on user profile)
9. Sort finances: notify home bank, set up international transfer, confirm relocation allowance details

ARRIVAL & FIRST WEEKS:
10. Register at gemeente (municipal registration) — this must happen within 5 days of arrival
11. Obtain BSN number (issued at gemeente registration — do NOT list this before gemeente)
12. Open Dutch bank account (bunq or ING — requires BSN)
13. Apply for DigiD (requires BSN and Dutch address)
14. Register with a Dutch GP (huisarts)
15. Arrange Dutch health insurance / zorgverzekering (mandatory within 4 months of arrival)

POST-ARRIVAL (housing & settling in):
16. Begin permanent housing search (Funda, Pararius) — only after understanding the local market
17. Understand Dutch rental market: income requirements, guarantor rules, bidding process
18. Arrange contents insurance
19. Transfer driving licence if applicable
20. Register children at school if applicable

Return ONLY a JSON array. No other text. Each task must have:
- title: string (concise, action-oriented)
- description: string (2-3 sentences explaining what to do, why it matters, and any deadline)
- category: one of [visa, housing, banking, employment, healthcare, transport, admin, shipping, pets]
- phase: one of [pre_arrival, arrival, post_arrival]
- priority: integer 1-10 (10 = most urgent / must happen first)
- estimated_days: integer (days before move date this should be completed — use negative numbers for post-arrival tasks, e.g. -7 means 7 days after arrival)
- external_link: string or null (verified official URL only — IND, VFS, gemeente, DigiD, etc.)

Generate 25-30 tasks total covering all phases. Return ONLY valid JSON array."""

        message = claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=6000,
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
