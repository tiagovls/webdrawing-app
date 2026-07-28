import { NextRequest, NextResponse } from 'next/server'

const CLERK_FAPI = 'https://frontend-api.clerk.services'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToClerk(req, path)
}

async function proxyToClerk(req: NextRequest, path: string[]) {
  try {
    const targetUrl = new URL(`${CLERK_FAPI}/${path.join('/')}`)
    targetUrl.search = req.nextUrl.search

    // Build safe headers (avoid restricted headers)
    const forwardHeaders: Record<string, string> = {}
    const allowed = [
      'accept',
      'accept-language',
      'content-type',
      'authorization',
      'cookie',
      'x-clerk-auth-token',
      'x-forwarded-for',
      'origin',
      'referer',
    ]
    for (const key of allowed) {
      const val = req.headers.get(key)
      if (val) forwardHeaders[key] = val
    }
    // Tell Clerk the real client IP
    forwardHeaders['x-forwarded-host'] = req.headers.get('host') ?? 'webdrawing.fr'

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      const body = await req.text()
      if (body) fetchOptions.body = body
    }

    const upstream = await fetch(targetUrl.toString(), fetchOptions)

    // Build response headers
    const resHeaders = new Headers()
    const copyHeaders = ['content-type', 'cache-control', 'set-cookie']
    for (const key of copyHeaders) {
      const val = upstream.headers.get(key)
      if (val) resHeaders.set(key, val)
    }
    resHeaders.set('Access-Control-Allow-Origin', '*')

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (err) {
    console.error('[clerk-proxy] Error:', err)
    return NextResponse.json({ error: 'Proxy error', details: String(err) }, { status: 502 })
  }
}
