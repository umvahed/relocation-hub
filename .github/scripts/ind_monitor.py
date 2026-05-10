"""
Fetches IND OAP TKV appointment slots for all 4 desks and forwards results to Railway.
Runs from GitHub Actions where IPs are not blocked by OAP's Cloudflare configuration.
"""
import urllib.request
import json
import ssl
import os
import sys

DESKS = [
    {"code": "AM", "name": "Amsterdam"},
    {"code": "DH", "name": "Den Haag"},
    {"code": "ZW", "name": "Zwolle"},
    {"code": "DB", "name": "'s-Hertogenbosch"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://oap.ind.nl/oap/en/",
}

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def fetch_desk(desk: dict) -> dict:
    url = f"https://oap.ind.nl/oap/api/desks/{desk['code']}/slots/?productKey=TKV&persons=1"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
            text = resp.read().decode()
        if text.startswith("while("):
            text = text[6:]
            if text.endswith(")"):
                text = text[:-1]
        data = json.loads(text).get("data") or []
        print(f"✓ {desk['code']}: {len(data)} slot(s)")
        return {
            "desk_code": desk["code"],
            "desk_name": desk["name"],
            "first_date": data[0]["date"] if data else None,
            "slot_count": len(data),
            "checked": True,
        }
    except Exception as e:
        print(f"✗ {desk['code']}: {e}", file=sys.stderr)
        return {
            "desk_code": desk["code"],
            "desk_name": desk["name"],
            "first_date": None,
            "slot_count": 0,
            "checked": False,
        }


def main():
    railway_url = os.environ["RAILWAY_URL"]
    resend_api_key = os.environ["RESEND_API_KEY"]

    results = [fetch_desk(desk) for desk in DESKS]
    print("Results:", json.dumps(results, indent=2))

    payload = json.dumps({"slot_results": results}).encode()
    req = urllib.request.Request(
        f"{railway_url}/api/ind-monitor/check",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {resend_api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("Railway response:", resp.read().decode())


if __name__ == "__main__":
    main()
