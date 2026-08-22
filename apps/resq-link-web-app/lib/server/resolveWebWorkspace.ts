import 'server-only'

import { isAdmin, isCommandCenterAccount } from '@packages/firebase/admin'
import type { DecodedIdToken } from 'firebase-admin/auth'
import type { WebWorkspace } from '@/lib/workspace'

const COMMAND_CENTER_CLAIM_ROLES = new Set([
  'command_center',
  'commandcenter',
  'command',
  'command_admin',
  'command_center_admin',
])

function normalizeClaim(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]/g, '_') : ''
}

function commandCenterFromClaims(token?: DecodedIdToken | null): boolean {
  if (!token) return false
  const claims = token as DecodedIdToken & {
    role?: unknown
    designation?: unknown
    isCommandCenter?: unknown
  }
  const role = normalizeClaim(claims.role)
  const designation = normalizeClaim(claims.designation)
  return (
    claims.isCommandCenter === true ||
    COMMAND_CENTER_CLAIM_ROLES.has(role) ||
    COMMAND_CENTER_CLAIM_ROLES.has(designation)
  )
}

/**
 * Collection-based workspace resolution.
 * Super Admin takes precedence if a UID exists in both admins and commandCenters.
 */
export async function resolveWebWorkspace(
  uid: string,
  token?: DecodedIdToken | null
): Promise<WebWorkspace> {
  const [adminDoc, commandCenterDoc] = await Promise.all([
    isAdmin(uid),
    isCommandCenterAccount(uid),
  ])

  if (adminDoc && commandCenterDoc) {
    console.warn(
      '[workspace] UID exists in both admins and commandCenters; super_admin takes precedence',
      uid
    )
    return 'super_admin'
  }

  if (adminDoc) return 'super_admin'
  if (commandCenterDoc) return 'command_center'
  if (commandCenterFromClaims(token)) return 'command_center'
  return 'unauthorized'
}
