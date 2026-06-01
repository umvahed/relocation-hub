import html as html_lib
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from app.config import settings
from app.routes.notifications import _send_email

router = APIRouter()
logger = logging.getLogger(__name__)

_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


class FeedbackRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    source: Optional[str] = None       # how they heard about Valryn
    most_useful: Optional[str] = None  # most useful feature
    missing: Optional[str] = None      # what's missing
    nps_score: Optional[int] = None    # 0-10


@router.post("/feedback")
async def submit_feedback(body: FeedbackRequest):
    sb = get_supabase()

    row = {
        "user_id": body.user_id or None,
        "email": body.email or None,
        "name": body.name or None,
        "source": body.source or None,
        "most_useful": body.most_useful or None,
        "missing": body.missing or None,
        "nps_score": body.nps_score,
    }

    try:
        sb.table("feedback").insert(row).execute()
    except Exception as e:
        logger.error("Failed to save feedback: %s", e)
        raise HTTPException(status_code=500, detail="Could not save feedback")

    _notify_ahmed(body)
    return {"received": True}


def _notify_ahmed(body: FeedbackRequest) -> None:
    name = html_lib.escape(body.name or "Anonymous")
    email = html_lib.escape(body.email or "—")
    source = html_lib.escape(body.source or "—")
    most_useful = html_lib.escape(body.most_useful or "—")
    missing = html_lib.escape(body.missing or "—")
    nps = body.nps_score

    nps_color = "#16a34a" if nps is not None and nps >= 9 else "#d97706" if nps is not None and nps >= 7 else "#dc2626"
    nps_label = f'<span style="font-size:22px;font-weight:800;color:{nps_color};">{nps}/10</span>' if nps is not None else "—"

    html = f"""
<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
  <div style="margin-bottom:20px;">
    <span style="font-size:18px;font-weight:700;">Valryn</span>
    <span style="font-size:13px;color:#6b7280;margin-left:8px;">New feedback received</span>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin:0 0 20px;">
    {name} left feedback
  </h2>

  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:140px;">Email</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">{email}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">How they heard</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">{source}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">NPS score</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">{nps_label}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;vertical-align:top;">Most useful</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;line-height:1.6;">{most_useful}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#6b7280;vertical-align:top;">Missing / improve</td>
      <td style="padding:10px 0;line-height:1.6;">{missing}</td>
    </tr>
  </table>
</div>
"""

    _send_email(
        to="ahmedvahed@gmail.com",
        subject=f"New Valryn feedback from {body.name or body.email or 'a user'}",
        html=html,
    )
