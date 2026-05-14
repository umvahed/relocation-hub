from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.config import settings
from supabase import create_client
from datetime import datetime, date

router = APIRouter()
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


def _escape_ical(text: str) -> str:
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/calendar/{user_id}/feed.ics")
async def get_ical_feed(user_id: str):
    try:
        supabase = get_supabase()
        tasks_res = supabase.table("tasks").select(
            "id, title, description, category, due_date, status"
        ).eq("user_id", user_id).not_.is_("due_date", "null").execute()

        profile_res = supabase.table("profiles").select("full_name").eq("id", user_id).execute()
        user_name = profile_res.data[0]["full_name"] if profile_res.data else "Relocatee"

        now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Valryn//Relocation Checklist//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{_escape_ical(user_name)}'s Relocation Plan",
            "X-WR-TIMEZONE:Europe/Amsterdam",
        ]

        for task in tasks_res.data or []:
            if not task.get("due_date"):
                continue

            due = date.fromisoformat(task["due_date"])
            dtstart = due.strftime("%Y%m%d")
            # All-day event ends the next day in iCal
            dtend = date(due.year, due.month, due.day + 1 if due.day < 28 else 1).strftime("%Y%m%d")

            status_mark = "✓ " if task["status"] == "completed" else ""
            summary = _escape_ical(f"{status_mark}{task['title']}")
            description = _escape_ical(task.get("description", "")[:300])
            uid = f"{task['id']}@valryn.nl"

            lines += [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now}",
                f"DTSTART;VALUE=DATE:{dtstart}",
                f"DTEND;VALUE=DATE:{dtend}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                f"CATEGORIES:{task['category'].upper()}",
                "END:VEVENT",
            ]

        lines.append("END:VCALENDAR")

        ical_content = "\r\n".join(lines) + "\r\n"

        return Response(
            content=ical_content,
            media_type="text/calendar; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="relocation-plan.ics"'},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
