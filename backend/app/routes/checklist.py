from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.config import settings
from app.deps import get_current_user_id
from supabase import create_client
from app.routes.notifications import notify_task_complete
from app.utils import check_paid_tier, is_paid_or_trial
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
    shipping_type: str = "luggage_only"  # "luggage_only", "container", "both"
    has_relocation_allowance: bool = False
    container_ship_date: str | None = None
    has_partner: bool = False
    partner_origin_country: str | None = None
    has_children: bool = False
    number_of_children: int = 0
    additional_context: str | None = None
    # Expanded onboarding fields (migration 014)
    employer_arranges_permit: str | None = None   # 'employer' | 'self' | 'eu_citizen' | 'unsure'
    employer_is_sponsor: bool | None = None
    has_driving_licence: bool | None = None
    driving_licence_country: str | None = None
    children_school_stage: str | None = None
    expects_30_ruling: bool | None = None
    already_in_netherlands: bool | None = None

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


async def _build_and_insert_tasks(supabase, claude, user_id: str, origin_country: str, move_date, employment_type: str, has_pets: bool, shipping_type: str, has_relocation_allowance: bool, container_ship_date: str | None = None, has_partner: bool = False, partner_origin_country: str | None = None, has_children: bool = False, number_of_children: int = 0, additional_context: str | None = None, employer_arranges_permit: str | None = None, employer_is_sponsor: bool | None = None, has_driving_licence: bool | None = None, driving_licence_country: str | None = None, children_school_stage: str | None = None, expects_30_ruling: bool | None = None, already_in_netherlands: bool | None = None) -> dict:
    conditional_notes = []

    if has_pets:
        conditional_notes.append("- The user IS bringing pets — include: EU pet passport or third-country health certificate, rabies vaccination and titre test (done 30+ days before travel), microchip registration, NVWA import notification, and airline pet policy research.")
    else:
        conditional_notes.append("- The user is NOT bringing pets — do NOT include any pet relocation tasks.")

    if shipping_type in ("container", "both"):
        ship_note = f" Container ship date: {container_ship_date}." if container_ship_date else " Ship date not yet set — remind user to book removal company early."
        arrival_note = " Containers typically take 2–4 weeks (UK/Europe), 6–10 weeks (South Africa/Americas), or 10–14 weeks (Australia) door-to-door including customs clearance. Include a task to track the container and arrange delivery from port."
        if shipping_type == "both":
            conditional_notes.append(f"- The user is shipping BOTH a container AND bringing luggage/air freight.{ship_note}{arrival_note} Include container tasks (packing inventory, removal company booking, customs T2L form, Douane registration, port delivery) AND luggage tasks (airline baggage allowance, excess baggage costs). Emphasise that container contents will arrive weeks/months after the user — plan accordingly.")
        else:
            conditional_notes.append(f"- The user is shipping a full container.{ship_note}{arrival_note} Include: packing inventory list, container/removal company booking, customs declaration (T2L form), Dutch customs (Douane) registration, port of entry clearance, and final delivery coordination.")
    else:
        conditional_notes.append("- The user is bringing luggage only — include: deciding what to sell/store/donate, and checking airline baggage allowance and excess baggage costs. Do NOT include container shipping tasks.")

    if has_relocation_allowance:
        conditional_notes.append("- The user has an employer relocation/housing allowance — include: confirming allowance amount and tax treatment (30% ruling interaction), keeping all receipts, and submitting expense claims to HR.")
    else:
        conditional_notes.append("- The user does NOT have an employer relocation allowance — do not include tasks about claiming or submitting relocation expenses to HR.")

    if employment_type == "employed":
        conditional_notes.append("- The user is moving for employment (salaried) — include 30% ruling enquiry if applicable (highly skilled migrant), payroll onboarding, and employment contract review. The employer submits the IND application.")
    elif employment_type == "self_employed":
        conditional_notes.append("- The user is self-employed/freelancing — include tasks for registering with KVK (Dutch Chamber of Commerce), obtaining a VAT number (BTW), and understanding ZZP tax obligations. Do NOT include employer-driven tasks like 30% ruling or TEV. The user will need to apply for a self-employment residence permit (zelfstandige) — note that the employer does NOT file on their behalf.")
    elif employment_type == "student":
        conditional_notes.append("- The user is moving as a student — include tasks for university/institution enrollment confirmation, student residence permit (applied for by the institution on their behalf), arranging student accommodation, and opening a student bank account. Do NOT include employment-related tasks like 30% ruling, payroll, or employer onboarding.")
    elif employment_type == "family":
        conditional_notes.append("- The user is moving for family reunification — include tasks for the family reunification residence permit (applied by the Dutch resident sponsor), obtaining an MVV if required, and registering at gemeente after arrival. Do NOT include employment or student-specific tasks.")

    child_count = max(number_of_children, 1) if has_children else 0
    if has_children:
        plural = child_count > 1
        conditional_notes.append(
            f"- The user IS relocating with {child_count} child{'ren' if plural else ''}. "
            f"Generate the following child-specific tasks:\n"
            f"  * {'Each child requires an' if plural else 'Child requires an'} apostilled birth certificate — "
            f"for South African users this is a separate Home Affairs apostille per child (same 4–8 week process as the main applicant); category: visa\n"
            f"  * Research and choose a Dutch school for {'each child' if plural else 'the child'}: "
            f"options are Dutch-only basisschool, tweetalige (bilingual Dutch/English) basisschool, or international school. "
            f"Most international families enrol in a tweetalige or international school initially while children learn Dutch. "
            f"Waiting lists can be 3–12 months — research schools before arrival and submit applications immediately on arriving; category: admin\n"
            f"  * Submit school enrolment application{'s' if plural else ''} (basisschool registration requires proof of address, birth certificate, and vaccination record — BSN needed); category: admin\n"
            f"  * Register {'children' if plural else 'child'} with a GP (huisarts) and the Jeugdgezondheidszorg (JGZ) for routine health checks and vaccinations; category: healthcare\n"
            f"  * If childcare is needed (kinderopvang/BSO after-school care), register on waiting lists immediately on arrival — typically 3–12 months wait in major Dutch cities; category: admin"
        )
    else:
        conditional_notes.append("- The user is NOT relocating with children — do NOT include any child-specific tasks (school enrolment, children's birth certificates, JGZ, kinderopvang).")

    if has_partner:
        partner_note = "- The user's partner IS relocating with them"
        if partner_origin_country:
            partner_note += f" from {partner_origin_country}"
        eu_eea = {"germany", "france", "belgium", "netherlands", "spain", "italy", "portugal", "ireland", "sweden", "denmark", "norway", "austria", "switzerland", "finland", "luxembourg", "poland", "czech republic", "hungary", "romania", "bulgaria", "greece", "croatia"}
        partner_is_eu = partner_origin_country and partner_origin_country.lower() in eu_eea
        if partner_is_eu:
            partner_note += " (EU/EEA national — free movement applies, no MVV needed, partner registers at gemeente directly). Generate partner tasks prefixed with '[Partner]' covering: gemeente registration, DigiD, health insurance, bank account, and driving licence exchange."
        else:
            partner_note += " (non-EU national — partner needs their own residence permit via the TEV/family reunification procedure, MVV if required, then gemeente registration, DigiD, health insurance, bank account, and driving licence exchange). Generate partner tasks prefixed with '[Partner]' for all of these."
        conditional_notes.append(partner_note)
    else:
        conditional_notes.append("- The user is relocating alone — do NOT generate any '[Partner]' prefixed tasks.")

    # ── Permit arrangement ────────────────────────────────────────────────────
    is_eu_citizen = employer_arranges_permit == 'eu_citizen'
    if is_eu_citizen:
        conditional_notes.append(
            "- CRITICAL: The user is an EU/EEA citizen — NO residence permit, MVV, or IND application is needed. "
            "Completely skip all visa/permit application tasks. They have freedom of movement and register directly at gemeente on arrival. "
            "Focus checklist on admin, housing, banking, healthcare, and employment onboarding only."
        )
    elif employer_arranges_permit == 'self':
        conditional_notes.append(
            "- The user is arranging their OWN permit (self-employed/DAFT). "
            "Include tasks for: KVK registration, BTW (VAT) number, self-employment permit application with IND, business plan (if applicable). "
            "Do NOT say 'your employer applies on your behalf' — the user applies directly."
        )
    elif employer_arranges_permit == 'employer':
        conditional_notes.append(
            "- The user's employer IS handling the permit (standard TEV procedure). "
            "The employer submits to IND; user waits for the approval letter. Reinforce that the user should chase HR for updates but not apply directly."
        )

    if employer_is_sponsor is False and not is_eu_citizen and employer_arranges_permit not in ('self',):
        conditional_notes.append(
            "- URGENT: The user's employer is NOT currently a registered IND recognised sponsor (erkend referent). "
            "Add a HIGH PRIORITY task: the employer must register as a recognised sponsor BEFORE submitting the permit application — this takes 4–8 weeks and is the biggest current blocker. "
            "User should contact HR immediately to confirm registration is in progress."
        )
    elif employer_is_sponsor is None and not is_eu_citizen and employer_arranges_permit not in ('self', 'unsure', None):
        conditional_notes.append(
            "- The user is unsure whether their employer is a registered IND sponsor. "
            "Add a task to verify this with HR immediately — if not registered, it adds 4–8 weeks."
        )

    # ── Current location ─────────────────────────────────────────────────────
    if already_in_netherlands:
        conditional_notes.append(
            "- The user is ALREADY living in the Netherlands. Adjust accordingly: "
            "gemeente registration and BSN are URGENT NOW (within 5 days of establishing a Dutch address — frame as overdue if not done). "
            "Skip flight booking and pre-departure logistics. Immediately prioritise: gemeente → BSN → DigiD → health insurance → bank account."
        )

    # ── 30% ruling ───────────────────────────────────────────────────────────
    if expects_30_ruling is True:
        conditional_notes.append(
            "- The user EXPECTS TO QUALIFY for the 30% ruling. Add a SPECIFIC URGENT task: "
            "submit the 30% ruling application with your employer within 4 months of your FIRST Dutch workday "
            "(not arrival date, not registration date — first day of work). "
            "Missing this window permanently forfeits eligibility. "
            "The employer submits to the Belastingdienst — confirm with HR this is in their process. External link: /tools/30-ruling"
        )
    elif expects_30_ruling is False:
        conditional_notes.append("- The user does NOT expect to qualify for the 30% ruling — omit 30% ruling tasks.")

    # ── Driving licence ───────────────────────────────────────────────────────
    if has_driving_licence is False:
        conditional_notes.append("- The user does NOT have a driving licence — omit all RDW driving licence exchange tasks.")
    elif has_driving_licence is True and driving_licence_country:
        direct_exchange_countries = {
            "united kingdom", "uk", "australia", "new zealand", "japan", "south korea",
            "singapore", "taiwan", "canada", "israel", "switzerland", "suriname",
            "aruba", "curaçao", "bonaire",
        }
        is_eu = origin_country.strip().lower() not in (
            "south africa", "za", "united states", "usa", "india", "brazil",
            "nigeria", "kenya", "ghana", "zimbabwe", "pakistan", "philippines",
        )
        country_lower = driving_licence_country.strip().lower()
        if country_lower in direct_exchange_countries or is_eu:
            conditional_notes.append(
                f"- The user has a driving licence from {driving_licence_country}. "
                "This country qualifies for DIRECT exchange at RDW — no theory or practical test required. "
                "Task: exchange at an RDW office within 185 days of gemeente registration. "
                "Bring original licence, gemeente registration confirmation, and BSN."
            )
        else:
            conditional_notes.append(
                f"- The user has a driving licence from {driving_licence_country}. "
                "This country does NOT have a full direct-exchange agreement with the Netherlands. "
                "The user will likely need to pass the CBR theory exam; the practical exam requirement depends on the country — check RDW.nl. "
                "Recommend starting Dutch driving theory study early. Deadline: 185 days after gemeente registration."
            )
    elif has_driving_licence is True:
        conditional_notes.append(
            "- The user has a driving licence (country of issue not specified). "
            "Include an RDW exchange task noting they should check RDW.nl for their country's specific requirements. "
            "Deadline: 185 days after gemeente registration."
        )

    # ── Children school stage ─────────────────────────────────────────────────
    if has_children and children_school_stage:
        stage_notes = {
            'preschool': (
                "Children are pre-school age (under 4). Prioritise finding kinderopvang (childcare) — "
                "waiting lists in major cities are 6–18 months, apply immediately on arrival. "
                "Also research peuterspeelzaal (playgroup). Skip basisschool enrolment for now."
            ),
            'primary': (
                "Children are primary school age (4–12, basisschool). Generate school-specific tasks: "
                "research Dutch basisschool vs tweetalige (bilingual Dutch/English) basisschool vs international school; "
                "waiting lists can be 3–12 months for popular schools; apply as soon as BSN is available; "
                "school requires proof of address, BSN, birth certificate, and vaccination record (rijksvaccinatieprogramma)."
            ),
            'secondary': (
                "Children are secondary school age (12–18). Research middelbare scholen: ISN (The Hague), British School, "
                "European School, and Dutch VO schools (HAVO/VWO/VMBO). "
                "Placement depends on home-country school report — get a certified translation. "
                "The Toelatingscommissie assesses foreign students. Apply well before start date."
            ),
            'both': (
                "User has BOTH primary and secondary school-age children. Generate tasks for both age groups: "
                "basisschool/tweetalige options for primary children AND middelbare school/international school for secondary children. "
                "Each type has different waiting lists, requirements, and timelines."
            ),
            'not_sure': (
                "Children's school stage is unconfirmed. Generate general school search tasks covering both primary and secondary options, "
                "with a note for the user to research the appropriate school type for each child's age."
            ),
        }
        note = stage_notes.get(children_school_stage)
        if note:
            conditional_notes.append(f"- SCHOOL STAGE: {note}")

    conditional_block = "\n".join(conditional_notes)
    is_south_africa = origin_country.strip().lower() in ("south africa", "za")

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

    # Build optional user-context block — capped at 800 chars to prevent prompt injection abuse
    if additional_context and additional_context.strip():
        context_snippet = additional_context.strip()[:800]
        user_context_block = f"""
User-provided situation notes (entered during onboarding):
"{context_snippet}"

Instructions for the above notes: Extract only information relevant to this Dutch relocation (e.g. steps already completed, in-progress items, specific concerns, unusual circumstances). Use it to skip or deprioritise tasks the user has already completed, add tasks for specific needs they mention, or adjust descriptions to reflect current progress. Silently ignore anything unrelated to their relocation.
"""
    else:
        user_context_block = ""

    prompt = f"""You are a senior relocation expert specialising in moves to the Netherlands. Generate a precise, correctly-sequenced relocation checklist for someone moving from {origin_country} to the Netherlands.

User profile:
- Employment type: {employment_type}
- Move date: {move_date or "Not specified"}
- Shipping: {shipping_type}
- Container ship date: {container_ship_date or "Not set"}
- Has pets: {has_pets}
- Has employer relocation allowance: {has_relocation_allowance}

{conditional_block}
{user_context_block}
{already_covered}

IMPORTANT FACTS about moving to the Netherlands — your tasks must reflect these accurately:
- The EMPLOYER (not the individual) submits the residence permit application to the IND via the TEV procedure. Do NOT generate a task telling the user to "apply for a residence permit" or "apply for an MVV" — these are done by the employer/sponsor.
- The IND approval letter (inwilligingsbrief) is received by the employer and forwarded to the employee. The user waits for it.
- The BSN (Burgerservicenummer) is issued automatically at gemeente registration — the user does not need to separately "apply for a BSN".
- DigiD requires BSN and a Dutch address and takes ~5 days by post.
- Health insurance (zorgverzekering) is mandatory and must be arranged within 4 months of gemeente registration; it is backdated to the registration date.
- Do NOT include tasks already listed in the ALREADY HANDLED section above.

Generate tasks covering ONLY these phases (skip anything in the ALREADY HANDLED list):

PHASE A — EMPLOYMENT (before departure, after IND approval):
- Review and sign employment contract — category: employment
- Confirm 30% ruling application submitted by employer (highly skilled migrants only) — category: employment
- Complete employer payroll onboarding paperwork — category: employment

PHASE B — PRE-DEPARTURE TRAVEL & LOGISTICS (before flying):
- Book flight to Netherlands (MVV valid 90 days from issue — must enter within this window) — category: transport
- Arrange temporary accommodation for first 1-3 months (do NOT commit to permanent housing before arriving — Dutch rental market requires local presence) — category: housing
- Notify home country bank of move, arrange international transfer capability — category: banking

PHASE C — ARRIVAL (first 2 weeks in the Netherlands):
- Register at gemeente / inschrijving — MUST happen within 5 days of establishing a residential address (BSN issued here) — category: admin
- Apply for DigiD (requires BSN + Dutch address; ~5 days by post) — category: admin
- Open Dutch bank account (bunq or ING — requires BSN) — category: banking
- Register with a GP (huisarts) — category: healthcare
- Arrange zorgverzekering (mandatory health insurance — within 4 months of registration, backdated to registration date) — category: healthcare

PHASE D — SETTLING IN (weeks 2-8+):
- Begin permanent housing search (Funda, Pararius — income must be 3-4x monthly rent; 2 months deposit typical) — category: housing
- Contents insurance (inboedelverzekering) — category: admin
- Exchange foreign driving licence for Dutch licence via RDW — must be done within 185 days of gemeente registration; rules vary by country of origin (some get direct exchange, others need theory or practical exam) — category: admin

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

    if is_eu_citizen:
        hardcoded = [{
            "title": "Verify passport or EU ID card validity for your stay",
            "description": (
                "As an EU/EEA citizen you have freedom of movement in the Netherlands — no residence permit or MVV is required. "
                "Ensure your passport or national ID card is valid for your entire planned stay. "
                "Recommended: at least 12 months of validity remaining. Keep your ID document accessible during your first weeks in NL as the gemeente will request it at registration."
            ),
            "category": "critical",
            "priority": 100,
            "external_link": None,
        }]
    elif is_south_africa:
        hardcoded = list(SA_VFS_PREREQUISITES + SA_DOCUMENT_TASKS)
        if has_children and child_count > 0:
            child_label = f"{child_count} children" if child_count > 1 else "your child"
            hardcoded.append({
                "title": f"Obtain apostilled birth certificate{'s' if child_count > 1 else ''} for {child_label}",
                "description": (
                    f"Each child relocating with you requires a separate apostilled birth certificate from the "
                    f"Department of Home Affairs — the process is identical to your own: submit the original (or "
                    f"certified copy) for apostilling and allow 4–8 weeks. Required by the IND and for Dutch school "
                    f"enrolment. Start immediately alongside your own documents."
                ),
                "category": "critical",
                "priority": 90,
                "external_link": "https://www.dha.gov.za/index.php/civic-services/apostille-authentication",
            })
    elif not is_eu_citizen:
        hardcoded = GENERAL_CRITICAL_TASKS

    tasks_to_insert = [{**doc, "user_id": user_id, "status": "pending", "source": "hardcoded"} for doc in hardcoded]

    for task in tasks:
        category = task.get("category", "admin")
        if category not in valid_categories or category == "critical":
            category = "admin"
        tasks_to_insert.append({
            "user_id": user_id,
            "title": task["title"],
            "description": task.get("description", ""),
            "category": category,
            "priority": task.get("priority", 5),
            "status": "pending",
            "source": "ai",
            "external_link": task.get("external_link"),
        })

    for task in tasks_to_insert:
        title_lower = task.get("title", "").lower()
        if "30%" in title_lower or "ruling" in title_lower:
            task["external_link"] = "/tools/30-ruling"

    # Pre-fill legal due dates from move_date — only for tasks with hard Dutch-law deadlines
    if move_date:
        try:
            from datetime import timedelta
            move_dt = date.fromisoformat(str(move_date)[:10])
            LEGAL_OFFSETS: list[tuple[list[str], int]] = [
                (["gemeente", "inschrijving", "register at gemeente"], 5),
                (["digid"], 17),
                (["zorgverzekering", "health insurance", "mandatory health"], 125),
                (["driving licen", "rdw", "exchange your driving"], 190),
            ]
            for task in tasks_to_insert:
                if task.get("due_date"):
                    continue
                combined = (task.get("title", "") + " " + task.get("description", "")).lower()
                for keywords, offset in LEGAL_OFFSETS:
                    if any(kw in combined for kw in keywords):
                        task["due_date"] = (move_dt + timedelta(days=offset)).isoformat()
                        break
        except Exception:
            pass

    result = supabase.table("tasks").insert(tasks_to_insert).execute()
    return {"message": "Checklist generated", "task_count": len(result.data), "tasks": result.data}


@router.post("/checklist/generate")
async def generate_checklist(request: GenerateChecklistRequest, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != request.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        existing = supabase.table("tasks").select("id").eq("user_id", request.user_id).execute()
        if existing.data:
            return {"message": "Checklist already exists", "tasks": existing.data}
        _check_and_increment_usage(supabase, request.user_id)
        return await _build_and_insert_tasks(
            supabase, get_claude(),
            request.user_id, request.origin_country, request.move_date,
            request.employment_type, request.has_pets, request.shipping_type,
            request.has_relocation_allowance, request.container_ship_date,
            request.has_partner, request.partner_origin_country,
            request.has_children, request.number_of_children,
            request.additional_context,
            request.employer_arranges_permit, request.employer_is_sponsor,
            request.has_driving_licence, request.driving_licence_country,
            request.children_school_stage, request.expects_30_ruling,
            request.already_in_netherlands,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class RegenerateRequest(BaseModel):
    user_id: str

@router.post("/checklist/regenerate")
async def regenerate_checklist(request: RegenerateRequest, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != request.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        check_paid_tier(supabase, request.user_id)
        profile_res = supabase.table("profiles").select("*").eq("id", request.user_id).execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        p = profile_res.data[0]

        # Snapshot state of existing tasks before wiping them
        existing_res = supabase.table("tasks").select("title, status, due_date, source").eq("user_id", request.user_id).execute()
        state_snapshot: dict[str, dict] = {}
        old_title_set: set[str] = set()
        for t in (existing_res.data or []):
            key = t["title"].lower().strip()
            if t.get("source") != "custom":
                old_title_set.add(key)
                state_snapshot[key] = {
                    "status": t.get("status", "pending"),
                    "due_date": t.get("due_date"),
                }

        # Delete only non-custom tasks — custom tasks survive regeneration
        supabase.table("tasks").delete().eq("user_id", request.user_id).neq("source", "custom").execute()

        result = await _build_and_insert_tasks(
            supabase, get_claude(),
            request.user_id,
            p["origin_country"],
            p.get("move_date"),
            p.get("employment_type", "employed"),
            p.get("has_pets", False),
            p.get("shipping_type", "luggage_only"),
            p.get("has_relocation_allowance", False),
            p.get("container_ship_date"),
            p.get("has_partner", False),
            p.get("partner_origin_country"),
            p.get("has_children", False),
            p.get("number_of_children", 0),
            None,  # additional_context not re-injected on regen
            p.get("employer_arranges_permit"),
            p.get("employer_is_sponsor"),
            p.get("has_driving_licence"),
            p.get("driving_licence_country"),
            p.get("children_school_stage"),
            p.get("expects_30_ruling"),
            p.get("already_in_netherlands"),
        )

        # Restore completed status and manually-set due dates for title-matched tasks
        for task in (result.get("tasks") or []):
            key = task["title"].lower().strip()
            prev = state_snapshot.get(key)
            if not prev:
                continue
            updates: dict = {}
            if prev["status"] == "completed":
                updates["status"] = "completed"
            # Restore old due_date if user had one set (takes priority over auto-generated)
            if prev["due_date"]:
                updates["due_date"] = prev["due_date"]
            if updates:
                supabase.table("tasks").update(updates).eq("id", task["id"]).execute()

        # Compute diff for frontend notification
        new_title_set = {t["title"].lower().strip() for t in (result.get("tasks") or []) if t.get("source") != "custom"}
        diff = {
            "added": len(new_title_set - old_title_set),
            "removed": len(old_title_set - new_title_set),
        }

        # Return full refreshed task list (including custom tasks that were kept)
        final = supabase.table("tasks").select("*").eq("user_id", request.user_id).order("priority", desc=True).execute()
        return {"message": "Checklist regenerated", "task_count": len(final.data), "tasks": final.data, "diff": diff}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/checklist/{user_id}/apply-dates")
async def apply_due_dates(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    """Apply legal due-date offsets to tasks that have no due_date, based on the profile's move_date.
    Safe to call any time move_date is set or changed — never overwrites existing due dates."""
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        from datetime import timedelta
        supabase = get_supabase()
        profile_res = supabase.table("profiles").select("move_date").eq("id", user_id).single().execute()
        move_date_str = (profile_res.data or {}).get("move_date")
        if not move_date_str:
            return {"updated": []}
        try:
            move_dt = date.fromisoformat(str(move_date_str)[:10])
        except Exception:
            return {"updated": []}

        tasks_res = supabase.table("tasks").select("id, title, description, due_date").eq("user_id", user_id).execute()
        tasks = [t for t in (tasks_res.data or []) if not t.get("due_date")]

        LEGAL_OFFSETS: list[tuple[list[str], int]] = [
            (["gemeente", "inschrijving", "register at gemeente"], 5),
            (["digid"], 17),
            (["zorgverzekering", "health insurance", "mandatory health"], 125),
            (["driving licen", "rdw", "exchange your driving"], 190),
        ]

        updated = []
        for task in tasks:
            combined = (task.get("title", "") + " " + task.get("description", "")).lower()
            for keywords, offset in LEGAL_OFFSETS:
                if any(kw in combined for kw in keywords):
                    new_date = (move_dt + timedelta(days=offset)).isoformat()
                    supabase.table("tasks").update({"due_date": new_date}).eq("id", task["id"]).execute()
                    updated.append({"id": task["id"], "due_date": new_date})
                    break

        return {"updated": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/checklist/{user_id}")
async def get_checklist(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        result = supabase.table("tasks").select("*").eq("user_id", user_id).order("priority", desc=True).execute()
        return {"tasks": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/usage/{user_id}")
async def get_usage(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
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


class CustomTaskRequest(BaseModel):
    user_id: str
    title: str
    category: str
    description: str | None = None

FREE_CUSTOM_TASK_LIMIT = 3

@router.post("/checklist/custom-task")
async def create_custom_task(request: CustomTaskRequest, auth_user_id: str = Depends(get_current_user_id)):
    if auth_user_id != request.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase = get_supabase()
        profile_res = supabase.table("profiles").select("tier, trial_ends_at").eq("id", request.user_id).execute()
        if profile_res.data and not is_paid_or_trial(profile_res.data[0]):
            existing = supabase.table("tasks").select("id").eq("user_id", request.user_id).eq("source", "custom").execute()
            if len(existing.data or []) >= FREE_CUSTOM_TASK_LIMIT:
                raise HTTPException(status_code=402, detail=f"Free plan allows {FREE_CUSTOM_TASK_LIMIT} custom tasks. Upgrade to add unlimited tasks.")
        valid_categories = {"critical", "visa", "admin", "employment", "housing", "banking", "healthcare", "transport", "shipping", "pets"}
        category = request.category if request.category in valid_categories else "admin"
        result = supabase.table("tasks").insert({
            "user_id": request.user_id,
            "title": request.title,
            "description": request.description or "",
            "category": category,
            "priority": 5,
            "status": "pending",
            "source": "custom",
        }).execute()
        return {"task": result.data[0] if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/checklist/task/{task_id}")
async def delete_task(task_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        supabase = get_supabase()
        task_res = supabase.table("tasks").select("source, user_id").eq("id", task_id).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        t = task_res.data[0]
        if t["user_id"] != auth_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if t.get("source") != "custom":
            raise HTTPException(status_code=403, detail="Only custom tasks can be deleted")
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"message": "Task deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/checklist/task/{task_id}")
async def update_task(task_id: str, status: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        supabase = get_supabase()
        owner_res = supabase.table("tasks").select("user_id").eq("id", task_id).execute()
        if not owner_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        if owner_res.data[0]["user_id"] != auth_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        result = supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
        # Only notify HR for high-signal categories — not every admin/banking/shopping task
        HR_NOTIFY_CATEGORIES = {"critical", "visa", "employment"}
        if status == "completed" and result.data:
            task = result.data[0]
            if task.get("category") in HR_NOTIFY_CATEGORIES:
                profile_res = supabase.table("profiles").select(
                    "full_name, contact_name, contact_email, partner_email, partner_full_name, tier, trial_ends_at"
                ).eq("id", task["user_id"]).execute()
                if profile_res.data and is_paid_or_trial(profile_res.data[0]):
                    notify_task_complete(task, profile_res.data[0])
        return {"message": "Task updated", "task": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
