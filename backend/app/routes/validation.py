import base64
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

SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}

DOC_TYPE_RULES = {
    "passport": (
        "Passport validation rules (IND 2025):\n"
        "- Must be valid for at least 6 months beyond the permit end date\n"
        "- Must have 2 or more blank visa pages\n"
        "- Photo page must be clearly visible and legible"
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
    profile_res = supabase.table("profiles").select("tier, ai_validation_consent, origin_country").eq("id", body.user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = profile_res.data[0]

    if profile["tier"] != "paid":
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

    # Determine age bracket from profile for salary threshold selection
    age_bracket = "30_plus"  # default conservative; frontend can pass DOB later

    system_prompt = (
        "You are a strict IND immigration document validator. "
        "Return ONLY valid JSON matching the exact schema requested. "
        "Never log, quote, reproduce, or reference personal data fields such as names, "
        "passport numbers, dates of birth, or addresses. Describe issues in general terms only."
    )

    user_prompt = (
        f"Validate this {doc_type.replace('_', ' ')} against the following rules.\n\n"
        f"Applicant age bracket: {age_bracket}\n\n"
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

    # Build content block — base64 inline (never URL)
    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
    if mime_type == "application/pdf":
        content_block: dict = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": encoded}}
    else:
        content_block = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": encoded}}

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
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "status": "fail",
            "summary": "Document unreadable — reupload a clearer scan",
            "issues": [{"severity": "error", "field": "document", "message": "Could not parse document content", "action": "Upload a higher-quality scan or PDF"}],
        }
    except Exception as e:
        # Log only document_id, never file content
        raise HTTPException(status_code=502, detail=f"AI validation failed for document {document_id}")

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

    return {
        "validation_id": saved.data[0]["id"],
        "document_id": document_id,
        "status": result["status"],
        "summary": result["summary"],
        "issues": result.get("issues", []),
        "validated_at": record["validated_at"],
    }


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
