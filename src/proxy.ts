import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig } from '@/auth.config'

const MODULE_ROUTES: Record<string, string[]> = {
  scheduling: ['/planovani', '/procedury', '/terapeuti'],
  hotel: ['/ubytovani'],
}

const ENABLED = new Set(
  (process.env.ENABLED_MODULES ?? 'scheduling,hotel').split(',').map((m) => m.trim())
)

function isDisabledModuleRoute(pathname: string): boolean {
  for (const [mod, prefixes] of Object.entries(MODULE_ROUTES)) {
    if (!ENABLED.has(mod) && prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return true
    }
  }
  return false
}

const { auth } = NextAuth(authConfig)

export default auth((req: NextRequest & { auth: unknown }) => {
  if (isDisabledModuleRoute(req.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 })
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
}
