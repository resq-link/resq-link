import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { WORKSPACE_COOKIE, routes } from '@/lib/routes'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const workspace = request.cookies.get(WORKSPACE_COOKIE)?.value

  // /login is always reachable so users can switch roles on the shared sign-in page.
  // Post-login routing is handled client-side after fresh workspace resolution.
  if (pathname === routes.login) {
    return NextResponse.next()
  }

  if (pathname.startsWith(routes.admin.root)) {
    if (workspace === 'command_center') {
      return NextResponse.redirect(new URL(routes.commandCenter.overview, request.url))
    }
    if (workspace !== 'super_admin') {
      const login = new URL(routes.login, request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
    return NextResponse.next()
  }

  if (pathname.startsWith(routes.commandCenter.root)) {
    if (workspace === 'super_admin') {
      return NextResponse.redirect(new URL(routes.admin.dashboard, request.url))
    }
    if (workspace !== 'command_center') {
      const login = new URL(routes.login, request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/command-center/:path*'],
}
