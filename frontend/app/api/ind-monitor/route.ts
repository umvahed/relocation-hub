export const runtime = 'edge'

const OAP_BASE = 'https://oap.ind.nl'
const DESKS = [
  { code: 'AM', name: 'Amsterdam' },
  { code: 'DH', name: 'Den Haag' },
  { code: 'ZW', name: 'Zwolle' },
  { code: 'DB', name: "'s-Hertogenbosch" },
]
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
  'Referer': 'https://oap.ind.nl/oap/en/',
  'Origin': 'https://oap.ind.nl',
}

function parseOap(text: string): any[] {
  let t = text.trim()
  if (t.startsWith('while(')) {
    t = t.slice(6)
    if (t.endsWith(')')) t = t.slice(0, -1)
  }
  try { return (JSON.parse(t).data ?? []) } catch { return [] }
}

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.RESEND_API_KEY

  if (!apiUrl || !apiKey) {
    return Response.json({ error: 'Missing configuration' }, { status: 500 })
  }

  // Query OAP from Vercel's network (Cloudflare edge — not blocked by OAP)
  const slotResults = await Promise.all(
    DESKS.map(async (desk) => {
      const url = `${OAP_BASE}/oap/api/desks/${desk.code}/slots/?productKey=TKV&persons=1`
      try {
        const r = await fetch(url, { headers: BROWSER_HEADERS })
        if (!r.ok) return { desk_code: desk.code, desk_name: desk.name, first_date: null, slot_count: 0, checked: false }
        const slots = parseOap(await r.text())
        return { desk_code: desk.code, desk_name: desk.name, first_date: slots[0]?.date ?? null, slot_count: slots.length, checked: true }
      } catch {
        return { desk_code: desk.code, desk_name: desk.name, first_date: null, slot_count: 0, checked: false }
      }
    })
  )

  // Hand off to Railway for DB storage + email notifications
  const res = await fetch(`${apiUrl}/api/ind-monitor/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_results: slotResults }),
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
