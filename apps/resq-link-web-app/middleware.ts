import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { WORKSPACE_COOKIE, routes } from '@/lib/routes'
import {
  LEGACY_COMMAND_CENTER_PATHS,
  isAdminRoute,
  isCommandCenterRoute,
} from '@/lib/workspaceRoutes'

const LEGACY_COMMAND_CENTER_DESTINATIONS: Record<string, string> = {
  '/dashboard': routes.commandCenter.overview,
  '/overview': routes.commandCenter.overview,
  '/map': routes.commandCenter.map,
  '/intake': routes.commandCenter.intake,
  '/sms': routes.commandCenter.sms,
  '/incidents': routes.commandCenter.incidents,
  '/footage-requests': routes.commandCenter.footageRequests,
  '/resources': routes.commandCenter.resources,
  '/teams': routes.commandCenter.teams,
  '/report': routes.commandCenter.report,
  '/history': routes.commandCenter.history,
  '/incident-management': routes.commandCenter.incidentManagement,
}

function legacyCommandCenterDestination(pathname: string): string | null {
  for (const legacy of LEGACY_COMMAND_CENTER_PATHS) {
    if (pathname === legacy) {
      return LEGACY_COMMAND_CENTER_DESTINATIONS[legacy] ?? `${routes.commandCenter.root}${legacy}`
    }
    if (pathname.startsWith(`${legacy}/`)) {
      const suffix = pathname.slice(legacy.length)
      const base = LEGACY_COMMAND_CENTER_DESTINATIONS[legacy] ?? `${routes.commandCenter.root}${legacy}`
      return `${base}${suffix}`
    }
  }
  return null
}

function isLegacyCommandCenterPath(pathname: string): boolean {
  return LEGACY_COMMAND_CENTER_PATHS.some(
    (legacy) => pathname === legacy || pathname.startsWith(`${legacy}/`)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const workspace = request.cookies.get(WORKSPACE_COOKIE)?.value

  if (pathname === routes.login) {
    return NextResponse.next()
  }

  if (isAdminRoute(pathname)) {
    if (workspace === 'command_center') {
      return NextResponse.redirect(new URL(routes.commandCenter.intake, request.url))
    }
    if (workspace !== 'super_admin') {
      const login = new URL(routes.login, request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
    return NextResponse.next()
  }

  if (isLegacyCommandCenterPath(pathname) || isCommandCenterRoute(pathname)) {
    if (workspace === 'super_admin') {
      return NextResponse.redirect(new URL(routes.admin.dashboard, request.url))
    }
    if (workspace !== 'command_center') {
      const login = new URL(routes.login, request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }

    const legacyDestination = legacyCommandCenterDestination(pathname)
    if (legacyDestination) {
      return NextResponse.redirect(new URL(legacyDestination, request.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/login',
    '/admin',
    '/admin/:path*',
    '/command-center',
    '/command-center/:path*',
    '/dashboard',
    '/overview',
    '/overview/:path*',
    '/map',
    '/map/:path*',
    '/intake',
    '/intake/:path*',
    '/sms',
    '/sms/:path*',
    '/incidents',
    '/incidents/:path*',
    '/footage-requests',
    '/footage-requests/:path*',
    '/resources',
    '/resources/:path*',
    '/teams',
    '/teams/:path*',
    '/report',
    '/report/:path*',
    '/history',
    '/history/:path*',
    '/incident-management',
    '/incident-management/:path*',
  ],
}
