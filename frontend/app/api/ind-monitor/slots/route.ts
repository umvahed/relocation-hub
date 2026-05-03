export const runtime = 'edge'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
  'Referer': 'https://oap.ind.nl/oap/en/',
  'Origin': 'https://oap.ind.nl',
}

export async function GET(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const authorization = request.headers.get('authorization')

  if (!apiKey || authorization !== `Bearer ${apiKey}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const desk = searchParams.get('desk')
  const productKey = searchParams.get('productKey')
  const persons = searchParams.get('persons') ?? '1'

  if (!desk || !productKey) {
    return Response.json({ error: 'Missing desk or productKey' }, { status: 400 })
  }

  const oapUrl = `https://oap.ind.nl/oap/api/desks/${desk}/slots/?productKey=${productKey}&persons=${persons}`

  try {
    const res = await fetch(oapUrl, { headers: BROWSER_HEADERS })
    const body = await res.text()
    return new Response(body || 'null', {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'X-OAP-Status': String(res.status),
        // Forward Cloudflare/server headers for diagnostics
        'X-Server': res.headers.get('server') ?? '',
        'X-CF-Ray': res.headers.get('cf-ray') ?? '',
      },
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 502 })
  }
}
