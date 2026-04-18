import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return NextResponse.json({ error: 'API_URL not set' }, { status: 500 })

  const res = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' })
  const data = await res.json()

  return NextResponse.json({ pinged: true, status: res.status, response: data })
}
