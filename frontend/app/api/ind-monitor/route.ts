export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.RESEND_API_KEY

  if (!apiUrl || !apiKey) {
    return Response.json({ error: 'Missing configuration' }, { status: 500 })
  }

  const res = await fetch(`${apiUrl}/api/ind-monitor/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
