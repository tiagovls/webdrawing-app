import { NextRequest, NextResponse } from 'next/server'

const CLERK_FAPI = 'https://frontend-api.clerk.services'

async function proxyToClerk(req: NextRequest, path: string[]): Promise<NextResponse> {
  const clerkUrl = new URL(`${CLERK_FAPI}/${path.join('/')}`)
  clerkUrl.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.set('host', 'frontend-api.clerk.services')
  // Remove headers that can cause issues
  headers.delete('connection')

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  }

  // Forward body for POST/PUT/PATCH
  if (!['GET', 'HEAD'].includes(req.method)) {
    fetchOptions.body = await req.arrayBuffer()
  }

  const res = await fetch(clerkUrl.toString(), fetchOptions)

  const responseHeaders = new Headers(res.headers)
  responseHeaders.delete('connection')

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  })
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}

export async function OPTIONS(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyToClerk(req, path)
}
