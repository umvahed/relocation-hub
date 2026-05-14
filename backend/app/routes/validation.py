import base64
import json
from datetime import date, datetime, timezone

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.routes.checklist import _check_and_increment_usage
from app.utils import is_paid_or_trial
from supabase import create_client

router = APIRouter()
_supabase = None
_claude = None

MIME_PDF = "application/pdf"
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", MIME_PDF}

DOC_TYPE_RULES = {
    "passport": (
        "Passport validation rules (IND 2025):\n"
        "- Must be valid for at least 6 months beyond the permit end date\n"
        "- Must have 2 or more blank visa pages\n"
        "- Photo page must be clearly visible and legible\n"
        "SEVERITY RULES (strictly enforced):\n"
        "- If the passport is already expired OR the visible expiry date is within 6 months of today "
        f"({date.today().isoformat()}): status MUST be 'fail', severity MUST be 'error'. Never downgrade to warn.\n"
        "- If blank visa pages cannot be confirmed from the image alone: status 'warn', severity 'warning'.\n"
        "- If photo page is obscured or unreadable: status 'fail', severity 'error'."
    ),
    "employment_contract": (
        "Employment contract validation rules (IND 2025):\n"
        "- Gross monthly salary must meet IND Highly Skilled Migrant thresholds: "
        "€4,171/mo for applicants under 30, €5,688/mo for applicants 30 and older\n"
        "- Contract must be signed by both parties\n"
        "- Contract must not be purely probationary with no confirmed start"
    ),
    "degree_certificate": (
        "Degree certificate validation rules (IND 2025):\n"
        "- Apostille stamp must be visible\n"
        "- Issuing institution must be clearly identifiable\n"
        "- If document language is not Dutch, English, German, or French, a certified translation is required"
    ),
    "police_clearance": (
        "Police clearance validation rules (IND 2025):\n"
        f"- Issue date must be within 6 months of today ({date.today().isoformat()})\n"
        "- Must be issued by the correct jurisdiction (country of residence/nationality)"
    ),
    "birth_certificate": (
        "Birth certificate validation rules (IND 2025):\n"
        "- Apostille stamp must be visible\n"
        "- If document language is not an EU official language, a certified translation is required"
    ),
    "general_document": (
        "General document validation rules:\n"
        "- Assess whether the document appears complete, signed where required, and legible\n"
        "- Note any missing stamps, signatures, or pages"
    ),
}


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


def _infer_doc_type(title: str, category: str) -> str:
    title_lower = title.lower()
    if "passport" in title_lower:
        return "passport"
    if "birth certificate" in title_lower:
        return "birth_certificate"
    if "police clearance" in title_lower or "police certificate" in title_lower:
        return "police_clearance"
    if "qualifications" in title_lower or "degree" in title_lower or "diploma" in title_lower:
        return "degree_certificate"
    if category == "employment" and "contract" in title_lower:
        return "employment_contract"
    return "general_document"


def _call_claude(file_bytes: bytes, mime_type: str, doc_type: str, rules: str, document_id: str) -> dict:
    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
    if mime_type == MIME_PDF:
        content_block: dict = {"type": "document", "source": {"type": "base64", "media_type": MIME_PDF, "data": encoded}}
    else:
        content_block = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": encoded}}

    user_prompt = (
        f"Validate this {doc_type.replace('_', ' ')} against the following rules.\n\n"
        "Applicant age bracket: 30_plus\n\n"
        f"{rules}\n\n"
        "Return ONLY this JSON schema — no other text:\n"
        "{\n"
        '  "status": "pass" | "warn" | "fail",\n'
        '  "summary": "<one sentence, no PII>",\n'
        '  "issues": [\n'
        '    { "severity": "error" | "warning" | "info", "field": "<field name>", "message": "<description>", "action": "<what to do>" }\n'
        "  ]\n"
        "}"
    )
    system_prompt = (
        "You are a strict IND immigration document validator. "
        "Return ONLY valid JSON matching the exact schema requested. "
        "Never log, quote, reproduce, or reference personal data fields such as names, "
        "passport numbers, dates of birth, or addresses. Describe issues in general terms only."
    )
    try:
        claude = get_claude()
        message = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": user_prompt}]}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "status": "fail",
            "summary": "Document unreadable — reupload a clearer scan",
            "issues": [{"severity": "error", "field": "document", "message": "Could not parse document content", "action": "Upload a higher-quality scan or PDF"}],
        }
    except Exception:
        raise HTTPException(status_code=502, detail=f"AI validation failed for document {document_id}")


class ValidateDocumentRequest(BaseModel):
    user_id: str


@router.post("/documents/{document_id}/validate", status_code=201)
async def validate_document(document_id: str, body: ValidateDocumentRequest):
    supabase = get_supabase()

    # Ownership check
    doc_res = supabase.table("documents").select("*").eq("id", document_id).eq("user_id", body.user_id).execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = doc_res.data[0]

    # Paywall check
    profile_res = supabase.table("profiles").select(
        "tier, trial_ends_at, ai_validation_consent, origin_country, full_name, contact_name, contact_email, notify_by_email"
    ).eq("id", body.user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = profile_res.data[0]

    if not is_paid_or_trial(profile):
        raise HTTPException(status_code=402, detail="paid_tier_required")

    if not profile["ai_validation_consent"]:
        raise HTTPException(status_code=400, detail="consent_required")

    # MIME type check
    mime_type = doc.get("mime_type", "")
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or mime_type == "application/msword":
        raise HTTPException(status_code=422, detail="Word documents cannot be validated — please upload a PDF or image scan")
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {mime_type}")

    # File size check
    file_size = doc.get("file_size", 0)
    if file_size and file_size > settings.MAX_VALIDATION_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File exceeds 20MB limit")

    # Rate limit
    _check_and_increment_usage(supabase, body.user_id, call_type="validation")

    # Fetch file bytes from Supabase Storage into RAM — never written to disk
    try:
        file_bytes = supabase.storage.from_("documents").download(doc["file_path"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch document: {e}")

    if len(file_bytes) > settings.MAX_VALIDATION_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File exceeds 20MB limit")

    # Infer document type from task context
    task_title = doc.get("task_title") or doc.get("file_name") or ""
    task_category = doc.get("category") or ""
    doc_type = _infer_doc_type(task_title, task_category)
    rules = DOC_TYPE_RULES[doc_type]

    result = _call_claude(file_bytes, mime_type, doc_type, rules, document_id)

    # Store result — raw bytes already garbage-collected at this point
    record = {
        "document_id": document_id,
        "user_id": body.user_id,
        "status": result["status"],
        "summary": result["summary"],
        "issues": result.get("issues", []),
        "model_version": "claude-sonnet-4-6",
        "validated_at": datetime.now(timezone.utc).isoformat(),
    }
    saved = supabase.table("document_validations").insert(record).execute()

    _notify_critical_doc_validation(supabase, doc, profile, record, body.user_id)

    return {
        "validation_id": saved.data[0]["id"],
        "document_id": document_id,
        "status": result["status"],
        "summary": result["summary"],
        "issues": result.get("issues", []),
        "validated_at": record["validated_at"],
    }


def _send_validation_email(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        return
    try:
        import resend as resend_lib
        resend_lib.api_key = settings.RESEND_API_KEY
        resend_lib.Emails.send({"from": settings.RESEND_FROM_EMAIL, "to": [to], "subject": subject, "html": html})
    except Exception:
        pass


def _build_issues_html(issues: list) -> str:
    SEV_COLOR = {"error": "#dc2626", "warning": "#d97706", "info": "#2563eb"}
    html = ""
    for issue in issues:
        sev = issue.get("severity", "info")
        col = SEV_COLOR.get(sev, "#6b7280")
        html += (
            f'<div style="border-left:3px solid {col};padding:8px 12px;margin-bottom:8px;background:#f9fafb;">'
            f'<p style="margin:0;font-size:12px;font-weight:700;color:{col};">{sev.upper()} · {issue.get("field","")}</p>'
            f'<p style="margin:4px 0 0;font-size:13px;color:#374151;">{issue.get("message","")}</p>'
            f'<p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-style:italic;">{issue.get("action","")}</p>'
            f'</div>'
        )
    return html


def _build_validation_email_html(
    greeting: str, intro: str, status_label: str, status_color: str,
    summary: str, issues_html: str, show_cta: bool,
) -> str:
    cta = ""
    if show_cta:
        cta = (
            f'<a href="{settings.FRONTEND_URL}/documents" style="display:inline-block;background:#4f46e5;color:#fff;'
            f'text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:20px;">'
            f'View &amp; fix document</a>'
        )
    issues_block = f'<div style="margin-bottom:16px;">{issues_html}</div>' if issues_html else ""
    return (
        '<div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">'
        '<div style="margin-bottom:20px;font-size:18px;font-weight:700;">'
        'Relocation<span style="color:#4f46e5;">Hub</span></div>'
        f'<h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Hi {greeting},</h2>'
        f'<p style="color:#6b7280;margin:0 0 16px;line-height:1.6;">{intro}</p>'
        f'<p style="font-size:15px;font-weight:700;color:{status_color};margin:0 0 12px;">{status_label}</p>'
        f'<p style="font-size:13px;color:#374151;margin:0 0 16px;">{summary}</p>'
        f'{issues_block}{cta}'
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>'
        '<p style="font-size:11px;color:#9ca3af;">Valryn &middot; valryn.nl</p>'
        '</div>'
    )


def _notify_critical_doc_validation(supabase, doc: dict, profile: dict, validation: dict, user_id: str) -> None:
    if not profile.get("notify_by_email", True):
        return
    task_id = doc.get("task_id")
    if not task_id:
        return
    task_res = supabase.table("tasks").select("title, category").eq("id", task_id).execute()
    if not task_res.data or task_res.data[0].get("category") != "critical":
        return

    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        user_email = auth_user.user.email or ""
    except Exception:
        user_email = ""

    status = validation["status"]
    file_name = doc.get("file_name", "document")
    task_title = task_res.data[0]["title"]
    user_name = profile.get("full_name") or "there"
    status_label = {"pass": "Passed ✅", "warn": "Passed with warnings ⚠️", "fail": "Failed ❌"}.get(status, status.upper())
    status_color = {"pass": "#16a34a", "warn": "#d97706", "fail": "#dc2626"}.get(status, "#6b7280")
    issues_html = _build_issues_html(validation.get("issues", []))

    if user_email:
        _send_validation_email(
            to=user_email,
            subject=f"Document validation result: {file_name}",
            html=_build_validation_email_html(
                greeting=user_name.split()[0],
                intro=f'Your <strong>{file_name}</strong> (critical task: <em>{task_title}</em>) has been validated.',
                status_label=status_label, status_color=status_color,
                summary=validation["summary"], issues_html=issues_html,
                show_cta=(status == "fail"),
            ),
        )

    contact_email = profile.get("contact_email")
    if contact_email:
        contact_name = profile.get("contact_name") or "there"
        _send_validation_email(
            to=contact_email,
            subject=f"{user_name}'s document validation: {status_label}",
            html=_build_validation_email_html(
                greeting=contact_name,
                intro=f'<strong>{user_name}</strong> uploaded <strong>{file_name}</strong> '
                      f'for critical task <em>{task_title}</em>. Here is the validation result:',
                status_label=status_label, status_color=status_color,
                summary=validation["summary"], issues_html=issues_html,
                show_cta=False,
            ),
        )


class EnrichProfileRequest(BaseModel):
    user_id: str


@router.post("/documents/{document_id}/enrich-profile")
async def enrich_profile_from_document(document_id: str, body: EnrichProfileRequest):
    """Extract profile hints (salary, job title, permit track) from an employment contract.
    Returns hints the frontend can offer to apply to the user's profile."""
    supabase = get_supabase()

    doc_res = supabase.table("documents").select("*").eq("id", document_id).eq("user_id", body.user_id).execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = doc_res.data[0]

    profile_res = supabase.table("profiles").select("tier, trial_ends_at").eq("id", body.user_id).execute()
    if not profile_res.data or not is_paid_or_trial(profile_res.data[0]):
        raise HTTPException(status_code=402, detail="paid_tier_required")

    mime_type = doc.get("mime_type", "")
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {mime_type}")

    try:
        file_bytes = supabase.storage.from_("documents").download(doc["file_path"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch document: {e}")

    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
    if mime_type == MIME_PDF:
        content_block: dict = {"type": "document", "source": {"type": "base64", "media_type": MIME_PDF, "data": encoded}}
    else:
        content_block = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": encoded}}

    user_prompt = (
        "Extract the following from this employment document. "
        "Return ONLY this JSON — no other text:\n"
        "{\n"
        '  "salary_monthly_eur": <number or null — gross monthly salary in EUR; convert if annual>,\n'
        '  "job_title": "<string or null>",\n'
        '  "permit_track": "highly_skilled_migrant" | "ict_transfer" | "daft" | "unknown",\n'
        '  "employer_name": "<string or null>"\n'
        "}\n\n"
        "For permit_track: 'highly_skilled_migrant' if salary >= €4000/mo and standard Dutch employment; "
        "'ict_transfer' if intra-company transfer; 'daft' if DAFT or self-employment treaty mentioned; 'unknown' if unclear."
    )

    try:
        claude = get_claude()
        message = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system="Extract employment contract details as JSON. Never reproduce personal data like names, addresses, or ID numbers.",
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": user_prompt}]}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        hints = json.loads(raw)
    except Exception:
        return {"profile_hints": None}

    return {"profile_hints": hints}


class ExtractDateRequest(BaseModel):
    user_id: str


@router.post("/documents/{document_id}/extract-date")
async def extract_document_date(document_id: str, body: ExtractDateRequest):
    """Extract the primary meaningful date from any uploaded document (passport expiry,
    flight departure, employment start, etc.) for the relocation timeline."""
    supabase = get_supabase()

    doc_res = supabase.table("documents").select("*").eq("id", document_id).eq("user_id", body.user_id).execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = doc_res.data[0]

    mime_type = doc.get("mime_type", "")
    if mime_type not in SUPPORTED_MIME_TYPES:
        return {"extracted_date": None, "extracted_date_label": None}

    try:
        file_bytes = supabase.storage.from_("documents").download(doc["file_path"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch document: {e}")

    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
    if mime_type == MIME_PDF:
        content_block: dict = {"type": "document", "source": {"type": "base64", "media_type": MIME_PDF, "data": encoded}}
    else:
        content_block = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": encoded}}

    prompt = (
        "Extract the single most important date from this document for a relocation timeline.\n"
        "Return ONLY valid JSON — no other text:\n"
        '{"date_value": "YYYY-MM-DD or null", "date_label": "max 4 words"}\n\n'
        "Rules by document type:\n"
        "- Passport / ID card: expiry date → label 'Passport expires'\n"
        "- Flight ticket / boarding pass: departure date → label 'Departure to [city]'\n"
        "- Employment contract / offer letter: employment start date → label 'Employment starts'\n"
        "- Lease / tenancy agreement: tenancy start date → label 'Tenancy begins'\n"
        "- IND / immigration letter: permit validity start → label 'Permit valid from'\n"
        "- Insurance certificate: policy start date → label 'Insurance starts'\n"
        "- Police clearance / apostille: issue date → label 'Certificate issued'\n"
        "- If no clear date can be found: {\"date_value\": null, \"date_label\": null}"
    )

    try:
        claude = get_claude()
        message = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=80,
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": prompt}]}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
    except Exception:
        return {"extracted_date": None, "extracted_date_label": None}

    date_value = result.get("date_value")
    date_label = result.get("date_label")

    if date_value and date_label:
        try:
            supabase.table("documents").update({
                "extracted_date": date_value,
                "extracted_date_label": date_label,
            }).eq("id", document_id).execute()
        except Exception:
            pass

    return {"extracted_date": date_value, "extracted_date_label": date_label}


@router.get("/documents/{document_id}/validation")
async def get_validation(document_id: str, user_id: str):
    supabase = get_supabase()
    result = (
        supabase.table("document_validations")
        .select("*")
        .eq("document_id", document_id)
        .eq("user_id", user_id)
        .order("validated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No validation found for this document")
    return result.data[0]
