from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from supabase import create_client
from app.routes.notifications import notify_task_complete
import anthropic
import json
from datetime import date

router = APIRouter()
_supabase = None
_claude = None

# VFS appointment prerequisites (South Africa) — must be in hand before the VFS appointment.
# These are the hard gate: nothing else in the relocation can proceed without the MVV sticker.
SA_VFS_PREREQUISITES = [
    {
        "title": "Obtain IND approval letter from your employer (inwilligingsbrief)",
        "description": "YOUR EMPLOYER applies to the IND on your behalf via the TEV procedure — you do not apply yourself. Once the IND approves, they issue the 'inwilligingsbrief' (approval letter) authorising your MVV. You cannot book a VFS appointment without this letter. Chase your employer's HR or immigration lawyer immediately to confirm the application has been submitted and get an estimated timeline (2–90 days depending on permit type).",
        "category": "critical",
        "priority": 100,
        "external_link": "https://ind.nl/en/residence-permits/work/highly-skilled-migrant",
    },
    {
        "title": "Verify passport validity (6+ months, 2+ blank pages)",
        "description": "Your passport must be valid for at least 6 months beyond your intended stay in the Netherlands and have a minimum of 2 blank pages for visa stamps. Check both right now — VFS will reject your application on the spot if either condition is not met. If your passport needs renewal, South African passports take 4–8 weeks at Home Affairs; start immediately.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://www.dha.gov.za",
    },
    {
        "title": "Complete and sign the MVV application form",
        "description": "Download the official MVV application form from the VFS Global Netherlands (South Africa) website. Fill it in completely and sign it in blue or black ink. This form must be submitted at your VFS appointment — incomplete or unsigned forms result in immediate rejection. Do not use correction fluid; obtain a new form if you make an error.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://www.vfsglobal.com/netherlands/southafrica/",
    },
    {
        "title": "Prepare photocopy of the IND approval letter",
        "description": "Once you receive the inwilligingsbrief from your employer, make a clear photocopy of the entire document. VFS requires both the original and a photocopy to be submitted at the appointment. Keep the original safe — it is the single most important document in your application and cannot be easily replaced.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://www.vfsglobal.com/netherlands/southafrica/",
    },
    {
        "title": "Get passport photos meeting Dutch ICAO requirements",
        "description": "Obtain recent passport photos that comply with Dutch ICAO standards: 35x45mm, plain white background, neutral expression, mouth closed, no glasses, taken within the last 6 months. Bring at least 2 original colour prints to your VFS appointment. Have them taken at a professional photo studio that knows Dutch/EU requirements — selfie-style prints are rejected.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://www.netherlandsworldwide.nl/dutch-passport-photos",
    },
    {
        "title": "Pay VFS application fee and keep proof of payment",
        "description": "Pay the VFS Global service fee in advance via the VFS website or at the centre on the day — check the current amount on the VFS Netherlands South Africa page as it changes. Save and print your proof of payment. VFS will not process your application without it. Keep a digital copy as backup.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://www.vfsglobal.com/netherlands/southafrica/",
    },
]

# SA document-gathering tasks — needed by the employer for the IND application.
# Start these immediately; they take 6–10 weeks at Home Affairs.
SA_DOCUMENT_TASKS = [
    {
        "title": "Obtain apostilled birth certificate",
        "description": "Your original birth certificate must be apostilled by the Department of Home Affairs. Submit your original (or certified copy) to a Home Affairs office or approved courier service. Processing takes 4–8 weeks — do not wait. The apostille is required by the IND for the TEV application your employer will submit on your behalf.",
        "category": "critical",
        "priority": 90,
        "external_link": "https://www.dha.gov.za/index.php/civic-services/apostille-authentication",
    },
    {
        "title": "Obtain apostilled police clearance certificate (SAPS)",
        "description": "Apply for a Police Clearance Certificate at your nearest SAPS Criminal Record Centre or online via the SAPS eServices portal. Once received, submit it to Home Affairs for apostilling. Allow 6–10 weeks total. Required for all adult applicants by the IND. Start this process immediately as it is the most common cause of delays.",
        "category": "critical",
        "priority": 90,
        "external_link": "https://www.saps.gov.za/services/crimrecordinfo.php",
    },
    {
        "title": "Apostille academic and professional qualifications",
        "description": "Your highest-level qualification certificates must be authenticated and apostilled. Submit originals to SAQA (South African Qualifications Authority) for evaluation, then to Home Affairs for the apostille stamp. Required for Knowledge Migrant, Highly Skilled Migrant, and most work permit categories. Allow 6–10 weeks for the full process.",
        "category": "critical",
        "priority": 90,
        "external_link": "https://www.saqa.org.za",
    },
]

# Generic prerequisite for non-South Africa users
GENERAL_CRITICAL_TASKS = [
    {
        "title": "Verify passport validity (6+ months, 2+ blank pages)",
        "description": "Your passport must be valid for at least 6 months beyond your intended stay in the Netherlands and have a minimum of 2 blank pages for visa stamps. Verify both immediately. If renewal is needed, check processing times for your country and start right away.",
        "category": "critical",
        "priority": 100,
        "external_link": None,
    },
    {
        "title": "Confirm your employer has submitted the IND residence permit application",
        "description": "For most work-related moves to the Netherlands, YOUR EMPLOYER submits the residence permit application to the IND on your behalf via the TEV or standard procedure. You do not apply yourself. Confirm with your HR or immigration lawyer that the application has been filed and obtain the expected IND decision timeline.",
        "category": "critical",
        "priority": 100,
        "external_link": "https://ind.nl/en/residence-permits/work/highly-skilled-migrant",
    },
]

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

def _check_and_increment_usage(supabase, user_id: str, call_type: str = "checklist"):
    today = date.today().isoformat()
    limit_map = {
        "checklist": settings.DAILY_AI_CALL_LIMIT,
        "validation": settings.DAILY_VALIDATION_LIMIT,
        "risk_score": settings.DAILY_RISK_SCORE_LIMIT,
    }
    limit = limit_map.get(call_type, settings.DAILY_AI_CALL_LIMIT)
    result = (
        supabase.table("api_usage")
        .select("id, call_count")
        .eq("user_id", user_id)
        .eq("date", today)
        .eq("call_type", call_type)
        .execute()
    )
    if result.data:
        record = result.data[0]
        if record["call_count"] >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily {call_type} limit of {limit} reached. Try again tomorrow."
            )
        supabase.table("api_usage").update({"call_count": record["call_count"] + 1, "updated_at": "now()"}).eq("id", record["id"]).execute()
    else:
        supabase.table("api_usage").insert({"user_id": user_id, "date": today, "call_count": 1, "call_type": call_type}).execute()


@router.post("/checklist/generate")
async def generate_checklist(request: GenerateChecklistRequest):
    try:
        supabase = get_supabase()
        claude = get_claude()
        existing = supabase.table("tasks").select("id").eq("user_id", request.user_id).execute()
        if existing.data:
            return {"message": "Checklist already exists", "tasks": existing.data}

        _check_and_increment_usage(supabase, request.user_id)

        conditional_notes = []

        # Pets
        if request.has_pets:
            conditional_notes.append("- The user IS bringing pets — include: EU pet passport or third-country health certificate, rabies vaccination and titre test (done 30+ days before travel), microchip registration, NVWA import notification, and airline pet policy research.")
        else:
            conditional_notes.append("- The user is NOT bringing pets — do NOT include any pet relocation tasks.")

        # Shipping
        if request.shipping_type == "container":
            conditional_notes.append("- The user is shipping a container — include: packing inventory list, container/removal company booking, customs declaration (T2L form), port of entry clearance, Dutch customs (Douane) registration, and final delivery coordination.")
        else:
            conditional_notes.append("- The user is bringing luggage only — include: deciding what to sell/store/donate, and checking airline baggage allowance and excess baggage costs. Do NOT include container shipping tasks.")

        # Relocation allowance
        if request.has_relocation_allowance:
            conditional_notes.append("- The user has an employer relocation/housing allowance — include: confirming allowance amount and tax treatment (30% ruling interaction), keeping all receipts, and submitting expense claims to HR.")
        else:
            conditional_notes.append("- The user does NOT have an employer relocation allowance — do not include tasks about claiming or submitting relocation expenses to HR.")

        # Employment type
        if request.employment_type == "employed":
            conditional_notes.append("- The user is moving for employment (salaried) — include 30% ruling enquiry if applicable (highly skilled migrant), payroll onboarding, and employment contract review. The employer submits the IND application.")
        elif request.employment_type == "self_employed":
            conditional_notes.append("- The user is self-employed/freelancing — include tasks for registering with KVK (Dutch Chamber of Commerce), obtaining a VAT number (BTW), and understanding ZZP tax obligations. Do NOT include employer-driven tasks like 30% ruling or TEV. The user will need to apply for a self-employment residence permit (zelfstandige) — note that the employer does NOT file on their behalf.")
        elif request.employment_type == "student":
            conditional_notes.append("- The user is moving as a student — include tasks for university/institution enrollment confirmation, student residence permit (applied for by the institution on their behalf), arranging student accommodation, and opening a student bank account. Do NOT include employment-related tasks like 30% ruling, payroll, or employer onboarding.")
        elif request.employment_type == "family":
            conditional_notes.append("- The user is moving for family reunification — include tasks for the family reunification residence permit (applied by the Dutch resident sponsor), obtaining an MVV if required, and registering at gemeente after arrival. Do NOT include employment or student-specific tasks.")

        conditional_block = "\n".join(conditional_notes) if conditional_notes else ""

        is_south_africa = request.origin_country.strip().lower() in ("south africa", "za")

        # Build the already-hardcoded task list so Claude knows not to duplicate them
        if is_south_africa:
            already_covered = """
ALREADY HANDLED — do NOT generate tasks for any of the following (they are hardcoded):
- Passport validity check
- IND approval letter / inwilligingsbrief
- MVV application form
- Photocopy of IND approval letter
- Passport photos for VFS
- VFS application fee / proof of payment
- VFS appointment booking or attendance
- Collecting passport with MVV sticker from VFS
- Apostilled birth certificate
- Police clearance certificate (SAPS)
- Apostilled academic or professional qualifications"""
        else:
            already_covered = """
ALREADY HANDLED — do NOT generate tasks for any of the following (they are hardcoded):
- Passport validity check
- IND residence permit application (employer submits this, not the user)"""

        prompt = f"""You are a senior relocation expert specialising in moves to the Netherlands. Generate a precise, correctly-sequenced relocation checklist for someone moving from {request.origin_country} to the Netherlands.

User profile:
- Employment type: {request.employment_type}
- Move date: {request.move_date or "Not specified"}
- Shipping: {request.shipping_type}
- Has pets: {request.has_pets}
- Has employer relocation allowance: {request.has_relocation_allowance}

{conditional_block}

{already_covered}

IMPORTANT FACTS about moving to the Netherlands — your tasks must reflect these accurately:
- The EMPLOYER (not the individual) submits the residence permit application to the IND via the TEV procedure. Do NOT generate a task telling the user to "apply for a residence permit" or "apply for an MVV" — these are done by the employer/sponsor.
- The IND approval letter (inwilligingsbrief) is received by the employer and forwarded to the employee. The user waits for it.
- The BSN (Burgerservicenummer) is issued automatically at gemeente registration — the user does not need to separately "apply for a BSN".
- DigiD requires BSN and a Dutch address and takes ~5 days by post.
- Health insurance (zorgverzekering) is mandatory and must be arranged within 4 months of gemeente registration; it is backdated to the registration date.
- Do NOT include tasks already listed in the ALREADY HANDLED section above.

Generate tasks covering ONLY these phases (skip anything in the ALREADY HANDLED list):

PHASE 3 — PRE-DEPARTURE LOGISTICS (before flying):
- Book flight to Netherlands (MVV valid 90 days from issue — must enter within this window)
- Arrange temporary accommodation for first 1-3 months (do NOT commit to permanent housing before arriving — Dutch rental market requires local presence)
- Notify home country bank of move, arrange international transfer capability
- Confirm employer 30% ruling application status (if applicable — highly skilled migrants only)
- Antecedents declaration form for accompanying family members (their permits processed 3 months after arrival)

PHASE 4 — ARRIVAL (first 2 weeks):
- Register at gemeente / inschrijving — MUST happen within 5 days of establishing a residential address (BSN issued here)
- Open Dutch bank account (bunq or ING — requires BSN)
- Apply for DigiD (requires BSN + Dutch address; ~5 days by post)
- Register with a GP (huisarts)
- Arrange zorgverzekering (mandatory health insurance — within 4 months of registration, backdated to registration date)

PHASE 5 — SETTLING IN (weeks 2-8+):
- Begin permanent housing search (Funda, Pararius — income must be 3-4x monthly rent; 2 months deposit typical)
- Contents insurance (inboedelverzekering)
- Exchange foreign driving licence for Dutch licence (within 6 months of gemeente registration)
- Register children at school (basisschool) if applicable
- Employment-specific tasks (payroll, 30% ruling, DigiD for tax portal)

Return ONLY a JSON array. No other text. Each task must have:
- title: string (concise, action-oriented, starts with a verb)
- description: string (3-4 sentences: what to do, why it matters, what is needed, and any hard deadline or consequence)
- category: one of [visa, admin, employment, housing, banking, healthcare, transport, shipping, pets]
- priority: integer 1-10 (10 = must happen soonest)
- external_link: string or null (official URLs only — ind.nl, digid.nl, rijksoverheid.nl, government or bank sites)

Generate 20-25 tasks. Return ONLY valid JSON array."""

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

        valid_categories = {"critical", "visa", "admin", "employment", "housing", "banking", "healthcare", "transport", "shipping", "pets"}

        # Hardcoded critical tasks — inserted first, before all Claude-generated tasks.
        # SA users get VFS prerequisites (priority 100) + document tasks (priority 90).
        # Other countries get the general prerequisites only.
        if is_south_africa:
            hardcoded = SA_VFS_PREREQUISITES + SA_DOCUMENT_TASKS
        else:
            hardcoded = GENERAL_CRITICAL_TASKS

        tasks_to_insert = [
            {**doc, "user_id": request.user_id, "status": "pending"}
            for doc in hardcoded
        ]

        # Claude-generated tasks — never in the "critical" category (that is hardcoded-only)
        for task in tasks:
            category = task.get("category", "admin")
            if category not in valid_categories or category == "critical":
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

@router.get("/usage/{user_id}")
async def get_usage(user_id: str):
    try:
        supabase = get_supabase()
        today = date.today().isoformat()
        result = supabase.table("api_usage").select("call_count, call_type").eq("user_id", user_id).eq("date", today).execute()
        counts = {row["call_type"]: row["call_count"] for row in result.data}
        return {
            "checklist_calls": counts.get("checklist", 0),
            "checklist_limit": settings.DAILY_AI_CALL_LIMIT,
            "validation_calls": counts.get("validation", 0),
            "validation_limit": settings.DAILY_VALIDATION_LIMIT,
            "risk_score_calls": counts.get("risk_score", 0),
            "risk_score_limit": settings.DAILY_RISK_SCORE_LIMIT,
            "date": today,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/checklist/task/{task_id}")
async def update_task(task_id: str, status: str):
    try:
        supabase = get_supabase()
        result = supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
        if status == "completed" and result.data:
            task = result.data[0]
            profile_res = supabase.table("profiles").select("full_name, contact_name, contact_email").eq("id", task["user_id"]).execute()
            if profile_res.data:
                notify_task_complete(task, profile_res.data[0])
        return {"message": "Task updated", "task": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
