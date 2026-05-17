import html as html_lib
from fastapi import APIRouter, HTTPException, Header, Depends
from app.config import settings
from app.deps import get_current_user_id, verify_cron_secret
from app.routes.notifications import _send_email
from supabase import create_client
from datetime import date, timedelta

router = APIRouter()
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


@router.post("/reminders/send")
async def send_reminders(_: None = Depends(verify_cron_secret)):

    supabase = get_supabase()
    today = date.today()
    reminder_window = (today + timedelta(days=3)).isoformat()

    # Tasks due within 3 days, not completed, reminder not yet sent today
    tasks_res = supabase.table("tasks").select(
        "id, user_id, title, description, category, due_date, reminder_sent_at"
    ).eq("status", "pending").lte("due_date", reminder_window).gte("due_date", today.isoformat()).execute()

    sent = 0
    for task in tasks_res.data or []:
        # Skip if reminder already sent today
        if task.get("reminder_sent_at"):
            sent_date = task["reminder_sent_at"][:10]
            if sent_date == today.isoformat():
                continue

        profile_res = supabase.table("profiles").select("full_name, email, contact_name, contact_email, partner_email").eq("id", task["user_id"]).execute()
        if not profile_res.data:
            continue

        profile = profile_res.data[0]
        user_name = html_lib.escape(profile.get("full_name") or "there")
        due_date = task["due_date"]
        days_left = (date.fromisoformat(due_date) - today).days
        due_label = "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"

        html = f"""
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700;">Relocation<span style="color: #4f46e5;">Hub</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Task due {due_label}</h2>
          <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
            Hi {user_name}, this task on your relocation checklist is coming up.
          </p>
          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 600; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Due {due_label}</div>
            <div style="font-size: 15px; font-weight: 600; color: #9a3412;">{html_lib.escape(task['title'])}</div>
            {f'<p style="font-size: 13px; color: #4b5563; margin: 8px 0 0; line-height: 1.5;">{html_lib.escape(task["description"][:200])}{"..." if len(task["description"]) > 200 else ""}</p>' if task.get("description") else ""}
          </div>
          <p style="color: #9ca3af; font-size: 13px;">Log in to mark it complete or update the due date.</p>
        </div>
        """

        # Email the user
        if _send_email(to=profile["email"], subject=f"Reminder: {task['title']} due {due_label}", html=html):
            supabase.table("tasks").update({"reminder_sent_at": today.isoformat()}).eq("id", task["id"]).execute()
            sent += 1

        # Also notify contact if set
        contact_email = profile.get("contact_email")
        if contact_email:
            contact_name = profile.get("contact_name") or "there"
            contact_html = html.replace(f"Hi {user_name},", f"Hi {contact_name},").replace(
                "this task on your relocation checklist",
                f"this task on {user_name}'s relocation checklist"
            )
            _send_email(to=contact_email, subject=f"Reminder for {user_name}: {task['title']} due {due_label}", html=contact_html)

        # For [Partner]-prefixed tasks, also notify the partner directly
        if task["title"].startswith("[Partner]"):
            partner_email = profile.get("partner_email")
            if partner_email:
                partner_html = html.replace(f"Hi {user_name},", "Hi,").replace(
                    "this task on your relocation checklist",
                    "this task on your relocation checklist"
                )
                _send_email(to=partner_email, subject=f"Reminder: {task['title']} due {due_label}", html=partner_html)

    return {"sent": sent, "checked": len(tasks_res.data or [])}


@router.patch("/reminders/task/{task_id}/due-date")
async def set_due_date(task_id: str, due_date: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        supabase = get_supabase()
        owner_res = supabase.table("tasks").select("user_id").eq("id", task_id).execute()
        if not owner_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        if owner_res.data[0]["user_id"] != auth_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        result = supabase.table("tasks").update({
            "due_date": due_date or None,
            "reminder_sent_at": None,
        }).eq("id", task_id).execute()
        return {"message": "Due date updated", "task": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
