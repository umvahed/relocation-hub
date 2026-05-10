"""
Calls Railway's weekly-reset endpoint every Monday.
Resets all active subscribers' personal slot flag to 'available' and emails them.
Runs from GitHub Actions — exception period (Nov 24 – Jan 7) is handled server-side.
"""
import urllib.request
import os
import sys


def main():
    railway_url = os.environ["RAILWAY_URL"]
    resend_api_key = os.environ["RESEND_API_KEY"]

    req = urllib.request.Request(
        f"{railway_url}/api/ind-monitor/weekly-reset",
        data=b"",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {resend_api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode()
        print("Railway response:", body)


if __name__ == "__main__":
    main()
