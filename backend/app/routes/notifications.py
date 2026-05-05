from datetime import date
from fastapi import APIRouter, HTTPException, Header
from app.config import settings
from supabase import create_client

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


def notify_task_complete(task: dict, profile: dict) -> None:
    user_name = profile.get("full_name", "Your relocatee")
    contact_name = profile.get("contact_name") or "there"
    task_title = task.get("title", "a task")
    task_description = task.get("description", "")
    category = task.get("category", "").capitalize()
    is_partner_task = task_title.startswith("[Partner]")

    def _task_html(greeting_name: str, relocatee_desc: str) -> str:
        return f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Relocation<span style="color: #4f46e5;">Hub</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hi {greeting_name},</h2>
      <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        {relocatee_desc} has just completed a task in their relocation plan.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">{category}</div>
        <div style="font-size: 15px; font-weight: 600; color: #15803d;">✓ {task_title}</div>
        {f'<p style="font-size: 13px; color: #4b5563; margin: 8px 0 0; line-height: 1.5;">{task_description[:200]}{"..." if len(task_description) > 200 else ""}</p>' if task_description else ""}
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">
        You're receiving this because you're listed as a contact for {user_name}'s relocation.
      </p>
    </div>
    """

    contact_email = profile.get("contact_email")
    if contact_email:
        _send_email(
            to=contact_email,
            subject=f"{user_name} completed: {task_title}",
            html=_task_html(contact_name, user_name),
        )

    if is_partner_task:
        partner_email = profile.get("partner_email")
        if partner_email:
            partner_name = profile.get("partner_full_name") or "there"
            _send_email(
                to=partner_email,
                subject=f"Your task completed: {task_title}",
                html=_task_html(partner_name, "You"),
            )


@router.post("/notifications/weekly-digest")
async def send_weekly_digest(authorization: str = Header(None)):
    # Simple shared-secret guard — Vercel cron sends this header
    if authorization != f"Bearer {settings.RESEND_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorised")

    supabase = get_supabase()
    profiles = supabase.table("profiles").select("*").not_.is_("contact_email", "null").execute()

    sent = 0
    for profile in profiles.data:
        try:
            user_id = profile["id"]
            user_name = profile.get("full_name", "Your relocatee")
            contact_email = profile["contact_email"]
            contact_name = profile.get("contact_name") or "there"

            tasks_res = supabase.table("tasks").select("title, status, category").eq("user_id", user_id).execute()
            all_tasks = tasks_res.data or []
            total = len(all_tasks)
            completed = [t for t in all_tasks if t["status"] == "completed"]
            pending = [t for t in all_tasks if t["status"] == "pending"]
            progress = round(len(completed) / total * 100) if total else 0

            # No digest once fully complete or settled (12+ weeks post move-date)
            if progress == 100:
                continue
            move_date_str = profile.get("move_date")
            if move_date_str:
                weeks_since_move = (date.today() - date.fromisoformat(move_date_str[:10])).days // 7
                if weeks_since_move >= 12:
                    continue

            recent_done = completed[-5:]
            upcoming = pending[:5]

            recent_html = "".join(
                f'<li style="margin-bottom:4px;">✓ {t["title"]}</li>'
                for t in reversed(recent_done)
            ) or "<li style='color:#9ca3af;'>None yet</li>"

            upcoming_html = "".join(
                f'<li style="margin-bottom:4px;">{t["title"]}</li>'
                for t in upcoming
            ) or "<li style='color:#9ca3af;'>All done!</li>"

            html = f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 18px; font-weight: 700;">Relocation<span style="color: #4f46e5;">Hub</span></span>
              </div>
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Weekly update — {user_name}</h2>
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                Here's a summary of {user_name}'s relocation progress this week.
              </p>

              <div style="background: #eef2ff; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 36px; font-weight: 800; color: #4f46e5;">{progress}%</div>
                <div style="font-size: 13px; color: #6b7280;">{len(completed)} of {total} tasks completed</div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #16a34a; margin: 0 0 8px;">Recently completed</h3>
                <ul style="font-size: 13px; color: #374151; padding-left: 16px; margin: 0; line-height: 1.8;">{recent_html}</ul>
              </div>

              <div style="margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #d97706; margin: 0 0 8px;">Up next</h3>
                <ul style="font-size: 13px; color: #374151; padding-left: 16px; margin: 0; line-height: 1.8;">{upcoming_html}</ul>
              </div>

              <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                You're receiving this because you're listed as the relocation contact for {user_name}.
              </p>
            </div>
            """

            if _send_email(
                to=contact_email,
                subject=f"Weekly relocation update — {user_name} ({progress}% complete)",
                html=html,
            ):
                sent += 1
        except Exception:
            continue

    return {"sent": sent, "total": len(profiles.data)}
