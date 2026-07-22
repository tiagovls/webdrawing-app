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
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Required for Clerk's internal routing
    '/__clerk/:path*',
  ],
}
