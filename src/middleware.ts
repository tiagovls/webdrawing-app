import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected route prefixes (checked manually to avoid deprecated createRouteMatcher)
const PROTECTED_PREFIXES = ['/dashboard', '/api/projects', '/api/upload', '/api/share']

function isProtected(req: NextRequest) {
  return PROTECTED_PREFIXES.some((prefix) => req.nextUrl.pathname.startsWith(prefix))
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
}
