from datetime import datetime, timezone


def is_paid_or_trial(profile: dict) -> bool:
    if profile.get("tier") == "paid":
        return True
    trial_ends_at = profile.get("trial_ends_at")
    if trial_ends_at:
        try:
            expires = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
            return expires > datetime.now(timezone.utc)
        except (ValueError, AttributeError):
            pass
    return False
