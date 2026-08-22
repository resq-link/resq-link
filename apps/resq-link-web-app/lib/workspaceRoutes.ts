import { routes } from './routes'

/** Legacy dispatcher URLs rewritten to /command-center/* in next.config.js */
export const LEGACY_COMMAND_CENTER_PATHS = [
  '/dashboard',
  '/overview',
  '/map',
  '/intake',
  '/sms',
  '/incidents',
  '/footage-requests',
  '/resources',
  '/teams',
  '/report',
  '/history',
  '/incident-management',
] as const

export function isAdminRoute(pathname: string): boolean {
  return pathname === routes.admin.root || pathname.startsWith(`${routes.admin.root}/`)
}

export function isCommandCenterRoute(pathname: string): boolean {
  if (pathname === routes.commandCenter.root || pathname.startsWith(`${routes.commandCenter.root}/`)) {
    return true
  }

  return LEGACY_COMMAND_CENTER_PATHS.some(
    (legacy) => pathname === legacy || pathname.startsWith(`${legacy}/`)
  )
}

export const middlewareMatcher = [
  '/login',
  '/admin',
  '/admin/:path*',
  '/command-center',
  '/command-center/:path*',
  ...LEGACY_COMMAND_CENTER_PATHS,
  ...LEGACY_COMMAND_CENTER_PATHS.map((path) => `${path}/:path*`),
] as const
