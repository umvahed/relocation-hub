"""
One-time script: send a personalised feedback email to all free-tier users.
Links to the in-app /feedback page (valryn.nl/feedback?uid=<user_id>).
Uses existing Resend + Supabase credentials — no external services needed.

Usage (from backend/ directory, with .env loaded or env vars set):
    python scripts/broadcast_feedback.py           # send for real
    python scripts/broadcast_feedback.py --dry-run # preview only
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
import resend
from supabase import create_client

# Load .env from backend/ regardless of where the script is called from
load_dotenv(Path(__file__).parent.parent / ".env")

# --dry-run  → print only, no emails sent
# --to EMAIL → send only to that address (for testing)
DRY_RUN    = "--dry-run" in sys.argv
TEST_TO    = next((sys.argv[i+1] for i, a in enumerate(sys.argv) if a == "--to" and i+1 < len(sys.argv)), None)

SUPABASE_URL  = os.environ["SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SERVICE_KEY"]
FROM_EMAIL    = os.environ.get("RESEND_FROM_EMAIL", "hello@valryn.nl")
FRONTEND_URL  = os.environ.get("FRONTEND_URL", "https://valryn.nl")

resend.api_key = os.environ["RESEND_API_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

if TEST_TO:
    users = [{"id": "test", "full_name": "Ahmed Vahed", "email": TEST_TO}]
    print(f"TEST MODE — sending one email to {TEST_TO}\n")
else:
    # Priority 1: free users who have set a move date (most committed)
    with_date = (
        sb.table("profiles")
        .select("id, full_name, email, created_at")
        .eq("tier", "free")
        .not_.is_("email", "null")
        .not_.is_("move_date", "null")
        .execute()
        .data or []
    )

    users = list(with_date)
    print(f"{'[DRY RUN] ' if DRY_RUN else ''}Sending to {len(users)} users with a move date...\n")

for user in users:
    email = (user.get("email") or "").strip()
    if not email:
        continue

    uid        = user["id"]
    first_name = (user.get("full_name") or "").split()[0].capitalize() or "there"
    feedback_url = f"{FRONTEND_URL}/feedback?uid={uid}"

    html = f"""
<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">

  <div style="margin-bottom:28px;">
    <span style="font-size:18px;font-weight:700;color:#1a1a1a;">Valryn</span>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;">Hi {first_name}, how's your move going?</h2>

  <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;">
    You signed up to Valryn a few days ago and I wanted to personally check in.
    I'm Ahmed, the founder — it's just me building this, so your experience genuinely matters.
  </p>

  <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;">
    I have four quick questions — what's working, what's confusing, and what would
    make Valryn more useful for your move to the Netherlands. Takes about 2 minutes.
  </p>

  <div style="margin:28px 0;">
    <a href="{feedback_url}"
       style="display:inline-block;background:#4f46e5;color:#fff;font-weight:600;
              font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none;">
      Share your feedback →
    </a>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
      🎁 Win full access
    </div>
    <p style="font-size:14px;color:#15803d;margin:0;line-height:1.6;">
      One person who completes this will receive a <strong>free full Valryn subscription</strong>
      (normally €19.99 — yours for life). I'll pick the most thoughtful response and reach out personally.
    </p>
  </div>

  <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;">
    And if you're stuck on anything — onboarding, documents, the IND process —
    just reply to this email. I read every message.
  </p>

  <p style="color:#4b5563;line-height:1.7;margin:0 0 32px;">
    Thanks for giving Valryn a try.<br>
    — Ahmed
  </p>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin-bottom:16px;">
  <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
    You're receiving this because you created an account at
    <a href="https://valryn.nl" style="color:#6b7280;">valryn.nl</a>.
  </p>

</div>
"""

    subject = f"Hi {first_name}, how is Valryn working for you? 🎁"

    if DRY_RUN:
        print(f"  [DRY RUN] {first_name} <{email}>")
        print(f"            Link: {feedback_url}\n")
    else:
        try:
            resp = resend.Emails.send({
                "from": FROM_EMAIL,
                "to": [email],
                "reply_to": "info@valryn.nl",
                "subject": subject,
                "html": html,
            })
            print(f"  OK {first_name} <{email}> id={resp.get('id') if isinstance(resp, dict) else resp}")
            time.sleep(0.3)
        except Exception as e:
            print(f"  FAIL {email}: {e}")

print(f"\nDone. {len(users)} users processed.")
