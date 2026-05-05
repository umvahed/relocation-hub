import io
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from pypdf import PdfWriter, PdfReader
from supabase import create_client

from app.config import settings

router = APIRouter()
_supabase = None

MERGEABLE_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"}


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _fmt_date(iso: str | None) -> str:
    if not iso:
        return "Not specified"
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%d %b %Y")
    except Exception:
        return iso


def _fmt_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    if b < 1024 * 1024:
        return f"{b / 1024:.1f} KB"
    return f"{b / (1024 * 1024):.1f} MB"


def _truncate_text(pdf: FPDF, text: str, max_width: float) -> str:
    if pdf.get_string_width(text) <= max_width:
        return text
    while text and pdf.get_string_width(text + "...") > max_width:
        text = text[:-1]
    return text + "..."


def _image_to_pdf_bytes(image_bytes: bytes) -> bytes | None:
    """Wrap a single image in a full-page PDF using fpdf2."""
    try:
        page_pdf = FPDF()
        page_pdf.set_margins(10, 10, 10)
        page_pdf.add_page()
        with io.BytesIO(image_bytes) as buf:
            page_pdf.image(buf, x=10, y=10, w=190)
        return bytes(page_pdf.output())
    except Exception:
        return None


def _build_cover_pdf(profile: dict, documents: list[dict], validations: dict) -> bytes:
    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.add_page()
    effective_w = pdf.w - 40  # 170mm for A4

    # Header — measure logo width explicitly so "Document Pack" is never clipped
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(79, 70, 229)
    logo_w = pdf.get_string_width("RelocationHub") + 2
    pdf.cell(logo_w, 10, "RelocationHub", ln=False)
    pdf.set_font("Helvetica", "", 18)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(0, 10, "  Document Pack", ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", ln=True)
    pdf.ln(3)
    pdf.set_draw_color(229, 231, 235)
    pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
    pdf.ln(6)

    def section_title(title: str) -> None:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(79, 70, 229)
        pdf.cell(0, 7, title.upper(), ln=True)
        pdf.set_draw_color(199, 210, 254)
        pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
        pdf.ln(3)

    def kv_row(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(107, 114, 128)
        pdf.cell(48, 6, label, border=0, ln=False)
        pdf.set_text_color(26, 26, 26)
        pdf.multi_cell(effective_w - 48, 6, value or "—")

    # Applicant
    section_title("Applicant Information")
    kv_row("Full name", profile.get("full_name") or "")
    kv_row("Email", profile.get("email") or "")
    kv_row("Origin country", profile.get("origin_country") or "")
    kv_row("Destination city", profile.get("destination_city") or "")
    kv_row("Move date", _fmt_date(profile.get("move_date")))
    pdf.ln(4)

    # Relocation overview
    section_title("Relocation Overview")
    kv_row("Employment type", (profile.get("employment_type") or "").replace("_", " ").title())
    kv_row("Relocation allowance", "Yes" if profile.get("has_relocation_allowance") else "No")
    pdf.ln(4)

    # Household
    has_children = profile.get("has_children")
    has_pets = profile.get("has_pets")
    if has_children is not None or has_pets is not None:
        section_title("Household")
        if has_children is not None:
            n = profile.get("number_of_children")
            kv_row("Children", f"Yes ({n})" if has_children and n else ("Yes" if has_children else "No"))
        if has_pets is not None:
            kv_row("Pets", "Yes" if has_pets else "No")
        pdf.ln(4)

    # Shipping
    shipping_type = profile.get("shipping_type")
    if shipping_type:
        section_title("Shipping & Logistics")
        kv_row("Shipping type", shipping_type.replace("_", " ").title())
        kv_row("Container ship date", _fmt_date(profile.get("container_ship_date")))
        pdf.ln(4)

    # HR contact
    contact_name = profile.get("contact_name")
    contact_email = profile.get("contact_email")
    if contact_name or contact_email:
        section_title("HR Contact")
        if contact_name:
            kv_row("Name", contact_name)
        if contact_email:
            kv_row("Email", contact_email)
        pdf.ln(4)

    # Documents table
    mergeable = [d for d in documents if d.get("mime_type") in MERGEABLE_TYPES]
    skipped = [d for d in documents if d.get("mime_type") not in MERGEABLE_TYPES]
    doc_count = len(mergeable)
    section_title(f"Documents included in this PDF  ({doc_count} file{'s' if doc_count != 1 else ''})")

    if not mergeable:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(107, 114, 128)
        pdf.cell(0, 7, "No documents uploaded.", ln=True)
    else:
        col_w = [8, 65, 28, 27, 22, 20]
        headers = ["#", "Filename", "Category", "Uploaded", "Size", "Validation"]

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(238, 242, 255)
        pdf.set_text_color(79, 70, 229)
        for w, h in zip(col_w, headers):
            pdf.cell(w, 7, h, fill=True, ln=False)
        pdf.ln()

        for i, doc in enumerate(mergeable, 1):
            v = validations.get(doc["id"])
            val_text = {"pass": "Pass", "warn": "Warn", "fail": "Fail"}.get(
                (v or {}).get("status", ""), "Not validated"
            )
            fill = (i % 2 == 0)
            pdf.set_fill_color(249, 250, 251) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(26, 26, 26)
            pdf.set_font("Helvetica", "", 8)
            row_vals = [
                str(i),
                _truncate_text(pdf, doc.get("file_name", ""), col_w[1] - 2),
                (doc.get("category") or "other").capitalize(),
                _fmt_date(doc.get("created_at")),
                _fmt_bytes(doc.get("file_size", 0)),
                val_text,
            ]
            for w, val in zip(col_w, row_vals):
                pdf.cell(w, 6, val, fill=fill, ln=False)
            pdf.ln()

    if skipped:
        pdf.ln(3)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(156, 163, 175)
        names = ", ".join(d.get("file_name", "unknown") for d in skipped)
        pdf.multi_cell(0, 5, f"Not included (unsupported format): {names}")

    # Footer
    pdf.ln(6)
    pdf.set_draw_color(229, 231, 235)
    pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(0, 5, "Generated by RelocationHub · relocation-hub.vercel.app", align="C", ln=True)

    return bytes(pdf.output())


async def _build_merged_pdf(user_id: str) -> tuple[bytes, str]:
    supabase = get_supabase()

    p_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = p_res.data[0]

    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        profile["email"] = auth_user.user.email or ""
    except Exception:
        profile["email"] = ""

    d_res = supabase.table("documents").select(
        "id, file_name, file_path, file_size, mime_type, category, created_at"
    ).eq("user_id", user_id).order("created_at", desc=False).execute()
    documents = d_res.data or []

    validations: dict = {}
    if documents:
        doc_ids = [d["id"] for d in documents]
        v_res = supabase.table("document_validations").select(
            "document_id, status, summary"
        ).in_("document_id", doc_ids).execute()
        for v in (v_res.data or []):
            validations[v["document_id"]] = v

    cover_bytes = _build_cover_pdf(profile, documents, validations)

    writer = PdfWriter()

    cover_reader = PdfReader(io.BytesIO(cover_bytes))
    for page in cover_reader.pages:
        writer.add_page(page)

    for doc in documents:
        mime = doc.get("mime_type", "")
        if mime not in MERGEABLE_TYPES:
            continue
        try:
            file_bytes = supabase.storage.from_("documents").download(doc["file_path"])
            if mime == "application/pdf":
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    writer.add_page(page)
            else:
                img_pdf_bytes = _image_to_pdf_bytes(file_bytes)
                if img_pdf_bytes:
                    reader = PdfReader(io.BytesIO(img_pdf_bytes))
                    for page in reader.pages:
                        writer.add_page(page)
        except Exception:
            pass

    output = io.BytesIO()
    writer.write(output)

    full_name = (profile.get("full_name") or "relocation").replace(" ", "_")
    return output.getvalue(), f"RelocationHub_DocPack_{full_name}.pdf"


@router.get("/docpack/{user_id}")
async def download_docpack(user_id: str):
    try:
        pdf_bytes, filename = await _build_merged_pdf(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build document pack: {e}")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/docpack/{user_id}/send-to-hr")
async def send_docpack_to_hr(user_id: str):
    supabase = get_supabase()

    p_res = supabase.table("profiles").select(
        "full_name, contact_name, contact_email"
    ).eq("id", user_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = p_res.data[0]

    if not profile.get("contact_email"):
        raise HTTPException(status_code=400, detail="No HR contact email set in your profile")

    pdf_bytes, _ = await _build_merged_pdf(user_id)

    storage_path = f"_docpacks/{user_id}/latest.pdf"
    try:
        supabase.storage.from_("documents").remove([storage_path])
    except Exception:
        pass
    supabase.storage.from_("documents").upload(
        storage_path, pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )

    signed = supabase.storage.from_("documents").create_signed_url(storage_path, 7 * 24 * 3600)
    url = signed.get("signedURL") or signed.get("signedUrl") or ""

    user_name = profile.get("full_name") or "Your relocatee"
    contact_name = profile.get("contact_name") or "there"
    contact_email = profile["contact_email"]

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Relocation<span style="color: #4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hi {contact_name},</h2>
      <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        {user_name} has shared their relocation document pack with you.
        It's a single PDF containing a cover page with their full profile followed by all uploaded supporting documents.
      </p>
      <a href="{url}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-bottom: 24px;">
        Open Document Pack PDF
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 24px;">This link expires in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">Sent via RelocationHub &middot; relocation-hub.vercel.app</p>
    </div>
    """

    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email service not configured")

    import resend as resend_lib
    resend_lib.api_key = settings.RESEND_API_KEY
    resend_lib.Emails.send({
        "from": settings.RESEND_FROM_EMAIL,
        "to": [contact_email],
        "subject": f"{user_name}'s Relocation Document Pack",
        "html": html,
    })

    return {"sent": True, "to": contact_email}
