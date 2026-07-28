import { NextRequest, NextResponse } from 'next/server'

// Vercel's DNS CAN resolve clerk.webdrawing.fr even if the user's browser cannot.
// We proxy directly to clerk.webdrawing.fr which tells Cloudflare/Clerk the correct instance.
const CLERK_FAPI = 'https://clerk.webdrawing.fr'

async function proxyToClerk(req: NextRequest, path: string[]) {
  try {
    const targetUrl = new URL(`${CLERK_FAPI}/${path.join('/')}`)
    targetUrl.search = req.nextUrl.search

    // Forward safe headers
    const forwardHeaders: Record<string, string> = {
      'accept': req.headers.get('accept') || '*/*',
      'accept-language': req.headers.get('accept-language') || 'fr',
      'origin': 'https://webdrawing.fr',
    }
    const contentType = req.headers.get('content-type')
    if (contentType) forwardHeaders['content-type'] = contentType
    const authorization = req.headers.get('authorization')
    if (authorization) forwardHeaders['authorization'] = authorization
    const cookie = req.headers.get('cookie')
    if (cookie) forwardHeaders['cookie'] = cookie

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      const body = await req.text()
      if (body) fetchOptions.body = body
    }

    const upstream = await fetch(targetUrl.toString(), fetchOptions)

    const resHeaders = new Headers()
    const contentTypeRes = upstream.headers.get('content-type')
    if (contentTypeRes) resHeaders.set('content-type', contentTypeRes)
    const cacheControl = upstream.headers.get('cache-control')
    if (cacheControl) resHeaders.set('cache-control', cacheControl)
    const setCookie = upstream.headers.get('set-cookie')
    if (setCookie) resHeaders.set('set-cookie', setCookie)
    resHeaders.set('access-control-allow-origin', '*')

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (err) {
    console.error('[clerk-proxy] Error proxying to clerk.webdrawing.fr:', err)
    return NextResponse.json(
      { error: 'Proxy error', details: String(err) },
      { status: 502 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToClerk(req, (await params).path)
}
