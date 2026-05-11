import type { NextAuthConfig } from 'next-auth'

const PUBLIC_PATHS = ['/prihlaseni', '/api/auth', '/api/health']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export const authConfig = {
  pages: { signIn: '/prihlaseni', error: '/prihlaseni' },
  // jwt here — proxy runs on Edge without DB access; auth.ts overrides to 'database'
  session: { strategy: 'jwt' as const },
  callbacks: {
    authorized({ auth, request }) {
      if (isPublic(request.nextUrl.pathname)) return true
      return !!auth
    },
  },
  providers: [],
} satisfies NextAuthConfig
