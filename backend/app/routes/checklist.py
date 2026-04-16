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
            conditional_notes.append("- The user is bringing pets — include: EU pet passport or third-country health certificate, rabies vaccination and titre test (done 30+ days before travel), microchip registration, NVWA import notification, and airline pet policy research.")
        if request.shipping_type == "container":
            conditional_notes.append("- The user is shipping a container — include: packing inventory list, container/removal company booking, customs declaration (T2L form), port of entry clearance, Dutch customs (Douane) registration, and final delivery coordination.")
        else:
            conditional_notes.append("- The user is bringing luggage only — include: deciding what to sell/store/donate, and checking airline baggage allowance and excess baggage costs.")
        if request.has_relocation_allowance:
            conditional_notes.append("- The user has an employer relocation/housing allowance — include: confirming allowance amount and tax treatment (30% ruling interaction), keeping all receipts, and submitting expense claims to HR.")

        conditional_block = "\n".join(conditional_notes) if conditional_notes else ""

        prompt = f"""You are a senior relocation expert specialising in moves to the Netherlands. Generate a precise, correctly-sequenced relocation checklist for someone moving from {request.origin_country} to the Netherlands.

User profile:
- Employment type: {request.employment_type}
- Move date: {request.move_date or "Not specified"}
- Shipping: {request.shipping_type}
- Has pets: {request.has_pets}
- Has employer relocation allowance: {request.has_relocation_allowance}

{conditional_block}

CRITICAL SEQUENCING — tasks must appear in this exact order of priority:

PHASE 1 — DOCUMENT PREPARATION (always first, before anything else):
These are gating documents. Nothing else can proceed without them.
1. Obtain apostilled birth certificate (original + apostille stamp from home country)
2. Obtain apostilled marriage certificate (if applicable)
3. Obtain police clearance certificate (apostilled — required by IND)
4. Obtain and apostille academic/professional qualifications
5. Prepare passport (valid 6+ months beyond intended stay, minimum 2 blank pages)

PHASE 2 — VISA & IND (depends on Phase 1):
6. Confirm employer is a recognised IND sponsor (check IND public register)
7. Employer submits combined MVV + residence permit application (TEV procedure) to IND — this is done by the employer, not the individual
8. Receive IND approval letter (MVV sticker authorisation) — wait time: 2-90 days depending on permit type
9. Book VFS Global appointment to submit passport and biometrics (for {request.origin_country} — VFS centres in Pretoria and Cape Town)
10. Attend VFS appointment: bring passport, IND approval letter, MVV application form, passport photo, proof of payment
11. Collect passport with MVV sticker from VFS

PHASE 3 — PRE-DEPARTURE LOGISTICS:
12. Complete antecedents declaration form for accompanying family members (their residence permits processed after 3 months in NL)
13. Book flight to Netherlands (MVV is valid for 90 days from issue — must enter within this window)
14. Arrange temporary accommodation for first 1-3 months (short-stay apartment, serviced accommodation or Airbnb — do NOT commit to permanent housing before arriving)
15. Notify home country bank of relocation, set up international transfer capability
16. Sort logistics (container or luggage — based on profile)

PHASE 4 — ARRIVAL (first 2 weeks):
17. Register at gemeente (municipal registration / inschrijving) — MUST happen within 5 days of establishing a residential address in NL
18. Receive BSN number — issued at gemeente registration (this is the Dutch equivalent of a tax/ID number; required for everything below)
19. Open Dutch bank account (bunq, ING, or Rabobank — all require BSN)
20. Apply for DigiD (Dutch digital ID — requires BSN and Dutch address; takes ~5 days by post)
21. Register with a Dutch GP (huisarts) — find one near your address via your health insurer's website
22. Arrange Dutch health insurance / zorgverzekering (legally mandatory within 4 months of registering in NL; backdated to registration date)

PHASE 5 — SETTLING IN (weeks 2-8):
23. Begin permanent housing search (Funda.nl, Pararius.nl) — only after understanding local rental market; Dutch landlords require proof of income, employer letter, and often 2 months deposit
24. Understand Dutch rental rules: income must be 3-4x monthly rent; bidding is competitive; use a local makelaar (estate agent) for guidance
25. Arrange contents insurance (inboedelverzekering)
26. Exchange foreign driving licence for Dutch licence if eligible (within 6 months of registration at gemeente)
27. Register children at school (basisschool) if applicable — contact local gemeente for school allocation

Return ONLY a JSON array. No other text. Each task must have:
- title: string (concise, action-oriented — start with a verb)
- description: string (3-4 sentences: what to do, why it matters, what documents/actions are needed, and any hard deadline or consequence of missing it)
- category: one of [documents, visa, admin, employment, housing, banking, healthcare, transport, shipping, pets]
- priority: integer 1-10 (10 = must happen first; documents and visa tasks = 9-10)
- estimated_days: integer (days before move date to complete this; post-arrival tasks use negative values e.g. -7 = 7 days after arrival)
- external_link: string or null (verified official URL — IND, VFS Global, DigiD, gemeente, Rijksoverheid only)

Generate 25-30 tasks. Return ONLY valid JSON array."""

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

        valid_categories = {"documents", "visa", "admin", "employment", "housing", "banking", "healthcare", "transport", "shipping", "pets"}
        tasks_to_insert = []
        for task in tasks:
            category = task.get("category", "admin")
            if category not in valid_categories:
                category = "admin"
            tasks_to_insert.append({
                "user_id": request.user_id,
                "title": task["title"],
                "description": task.get("description", ""),
                "category": category,
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
