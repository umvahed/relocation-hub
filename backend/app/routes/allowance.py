import io
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from pydantic import BaseModel
from supabase import create_client

from app.config import settings

router = APIRouter()
_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _send_email(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        return False
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception:
        return False


def _hr_expense_email(profile: dict, expense: dict, balance: float) -> str:
    user_name = profile.get("full_name", "Your relocatee")
    contact_name = profile.get("contact_name") or "there"
    description = expense.get("description", "")
    amount = expense.get("amount_eur", 0)
    total = profile.get("relocation_allowance_amount") or 0
    return f"""
<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <div style="margin-bottom: 24px;">
    <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Relocation<span style="color: #4f46e5;">Hub</span></span>
  </div>
  <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hi {contact_name},</h2>
  <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
    {user_name} has logged a new relocation expense against their allowance.
  </p>
  <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
    <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Expense</div>
    <div style="font-size: 16px; font-weight: 600; color: #1e40af;">{description}</div>
    <div style="font-size: 22px; font-weight: 700; color: #1e40af; margin-top: 6px;">€{amount:,.2f}</div>
  </div>
  <div style="display: flex; gap: 12px; margin-bottom: 24px;">
    <div style="flex: 1; background: #f9fafb; border-radius: 10px; padding: 12px 16px;">
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Total allowance</div>
      <div style="font-size: 15px; font-weight: 600;">€{total:,.2f}</div>
    </div>
    <div style="flex: 1; background: {'#f0fdf4' if balance >= 0 else '#fef2f2'}; border-radius: 10px; padding: 12px 16px;">
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Remaining balance</div>
      <div style="font-size: 15px; font-weight: 600; color: {'#16a34a' if balance >= 0 else '#dc2626'};">€{balance:,.2f}</div>
    </div>
  </div>
  <p style="color: #9ca3af; font-size: 13px; margin: 0;">
    You're receiving this because you're listed as a contact for {user_name}'s relocation.
  </p>
</div>
"""


# ── GET /api/allowance/{user_id} ──────────────────────────────────────────────

@router.get("/allowance/{user_id}")
async def get_allowance(user_id: str):
    sb = get_supabase()
    profile_res = sb.table("profiles").select(
        "relocation_allowance_amount, has_relocation_allowance"
    ).eq("user_id", user_id).single().execute()
    profile = profile_res.data or {}

    expenses_res = sb.table("allowance_expenses").select(
        "id, task_id, description, amount_eur, created_at"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()
    expenses = expenses_res.data or []

    total = float(profile.get("relocation_allowance_amount") or 0)
    spent = sum(float(e["amount_eur"]) for e in expenses)
    return {
        "total": total,
        "spent": spent,
        "balance": total - spent,
        "expenses": expenses,
    }


# ── PATCH /api/allowance/{user_id}/amount ────────────────────────────────────

class SetAmountRequest(BaseModel):
    amount: float


@router.patch("/allowance/{user_id}/amount")
async def set_allowance_amount(user_id: str, body: SetAmountRequest):
    if body.amount < 0:
        raise HTTPException(status_code=422, detail="Amount must be non-negative")
    sb = get_supabase()
    sb.table("profiles").update({
        "relocation_allowance_amount": body.amount,
        "has_relocation_allowance": True,
    }).eq("user_id", user_id).execute()
    return {"ok": True}


# ── POST /api/allowance/{user_id}/expense ─────────────────────────────────────

class AddExpenseRequest(BaseModel):
    description: str
    amount_eur: float
    task_id: str | None = None


@router.post("/allowance/{user_id}/expense")
async def add_expense(user_id: str, body: AddExpenseRequest):
    if body.amount_eur <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    sb = get_supabase()

    row = {
        "user_id": user_id,
        "description": body.description.strip(),
        "amount_eur": body.amount_eur,
    }
    if body.task_id:
        row["task_id"] = body.task_id

    res = sb.table("allowance_expenses").insert(row).execute()
    expense = res.data[0] if res.data else row

    # Compute new balance for the email
    profile_res = sb.table("profiles").select(
        "relocation_allowance_amount, contact_email, contact_name, full_name"
    ).eq("user_id", user_id).single().execute()
    profile = profile_res.data or {}

    expenses_res = sb.table("allowance_expenses").select("amount_eur").eq("user_id", user_id).execute()
    spent = sum(float(e["amount_eur"]) for e in (expenses_res.data or []))
    total = float(profile.get("relocation_allowance_amount") or 0)
    balance = total - spent

    contact_email = profile.get("contact_email")
    if contact_email:
        subject = f"Relocation expense logged — {body.description[:60]}"
        html = _hr_expense_email(profile, {"description": body.description, "amount_eur": body.amount_eur}, balance)
        _send_email(contact_email, subject, html)

    return expense


# ── DELETE /api/allowance/expense/{expense_id} ───────────────────────────────

@router.delete("/allowance/expense/{expense_id}")
async def delete_expense(expense_id: str, user_id: str):
    sb = get_supabase()
    res = sb.table("allowance_expenses").select("id, user_id").eq("id", expense_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    if res.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your expense")
    sb.table("allowance_expenses").delete().eq("id", expense_id).execute()
    return {"ok": True}


# ── GET /api/allowance/{user_id}/export ──────────────────────────────────────

@router.get("/allowance/{user_id}/export")
async def export_allowance(user_id: str):
    sb = get_supabase()
    profile_res = sb.table("profiles").select(
        "full_name, relocation_allowance_amount"
    ).eq("user_id", user_id).single().execute()
    profile = profile_res.data or {}

    expenses_res = sb.table("allowance_expenses").select(
        "description, amount_eur, created_at"
    ).eq("user_id", user_id).order("created_at").execute()
    expenses = expenses_res.data or []

    total = float(profile.get("relocation_allowance_amount") or 0)
    spent = sum(float(e["amount_eur"]) for e in expenses)
    balance = total - spent

    pdf_bytes = _build_statement_pdf(profile, expenses, total, spent, balance)
    filename = f"RelocationHub_Allowance_Statement.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_statement_pdf(profile: dict, expenses: list, total: float, spent: float, balance: float) -> bytes:
    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.add_page()
    w = pdf.w - 40  # usable width

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(79, 70, 229)
    logo_w = pdf.get_string_width("RelocationHub") + 2
    pdf.cell(logo_w, 10, "RelocationHub", ln=False)
    pdf.set_font("Helvetica", "", 18)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(0, 10, "  Allowance Statement", ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", ln=True)
    pdf.ln(4)
    pdf.set_draw_color(229, 231, 235)
    pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
    pdf.ln(6)

    # Employee info
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(0, 6, profile.get("full_name", ""), ln=True)
    pdf.ln(4)

    # Summary boxes
    col_w = (w - 6) / 3
    def _summary_box(label: str, value: str, color_rgb: tuple):
        pdf.set_fill_color(*color_rgb)
        pdf.set_draw_color(229, 231, 235)
        x_start = pdf.get_x()
        y_start = pdf.get_y()
        pdf.rect(x_start, y_start, col_w, 18, style="FD")
        pdf.set_xy(x_start + 4, y_start + 3)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(107, 114, 128)
        pdf.cell(col_w - 8, 5, label, ln=True)
        pdf.set_xy(x_start + 4, y_start + 9)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(26, 26, 26)
        pdf.cell(col_w - 8, 6, value, ln=False)
        pdf.set_xy(x_start + col_w + 3, y_start)

    _summary_box("Total allowance", f"EUR {total:,.2f}", (239, 246, 255))
    _summary_box("Amount spent", f"EUR {spent:,.2f}", (254, 242, 242) if spent > total else (249, 250, 251))
    _summary_box("Remaining balance", f"EUR {balance:,.2f}", (240, 253, 244) if balance >= 0 else (254, 242, 242))
    pdf.ln(22)

    # Expense table
    if expenses:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(249, 250, 251)
        pdf.set_text_color(107, 114, 128)
        pdf.cell(28, 7, "Date", border="B", fill=True)
        pdf.cell(w - 56, 7, "Description", border="B", fill=True)
        pdf.cell(28, 7, "Amount (EUR)", border="B", fill=True, align="R")
        pdf.ln()

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(26, 26, 26)
        for e in expenses:
            date_str = ""
            try:
                date_str = datetime.fromisoformat(e["created_at"].replace("Z", "+00:00")).strftime("%d %b %Y")
            except Exception:
                date_str = ""
            desc = e.get("description", "")
            # Truncate description to fit
            max_desc_w = w - 56
            if pdf.get_string_width(desc) > max_desc_w:
                while desc and pdf.get_string_width(desc + "...") > max_desc_w:
                    desc = desc[:-1]
                desc += "..."
            amount = float(e.get("amount_eur", 0))
            pdf.cell(28, 7, date_str)
            pdf.cell(w - 56, 7, desc)
            pdf.cell(28, 7, f"{amount:,.2f}", align="R")
            pdf.ln()

        pdf.set_draw_color(229, 231, 235)
        pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(28 + w - 56, 7, "Total spent")
        pdf.cell(28, 7, f"{spent:,.2f}", align="R")
        pdf.ln()
    else:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(0, 10, "No expenses logged yet.", ln=True)

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(0, 5, "RelocationHub — Allowance Statement — For internal use only", align="C")

    return bytes(pdf.output())
