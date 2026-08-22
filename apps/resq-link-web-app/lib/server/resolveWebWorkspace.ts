import 'server-only'

import { getAdminFirestore, isAdmin, isCommandCenterAccount } from '@packages/firebase/admin'
import type { DecodedIdToken } from 'firebase-admin/auth'
import type { WebWorkspace } from '@/lib/workspace'

const COMMAND_CENTER_CLAIM_ROLES = new Set([
  'command_center',
  'commandcenter',
  'command',
  'command_admin',
  'command_center_admin',
])

const SUPER_ADMIN_CLAIM_ROLES = new Set(['super_admin', 'superadmin', 'platform_admin'])

function normalizeClaim(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]/g, '_') : ''
}

function superAdminFromClaims(token?: DecodedIdToken | null): boolean {
  if (!token) return false
  const claims = token as DecodedIdToken & {
    role?: unknown
    designation?: unknown
    isSuperAdmin?: unknown
  }
  const role = normalizeClaim(claims.role)
  const designation = normalizeClaim(claims.designation)
  return (
    claims.isSuperAdmin === true ||
    SUPER_ADMIN_CLAIM_ROLES.has(role) ||
    SUPER_ADMIN_CLAIM_ROLES.has(designation)
  )
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

async function isAdminByEmail(email: string | null | undefined): Promise<boolean> {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalized) return false

  const snap = await getAdminFirestore()
    .collection('admins')
    .where('email', '==', normalized)
    .limit(1)
    .get()

  return !snap.empty
}

/**
 * Deterministic workspace resolution priority:
 * 1. Super Admin (`admins/{uid}` or matching admin email / super_admin claims)
 * 2. Command Center (`commandCenters/{uid}` or command_center claims)
 * 3. unauthorized
 */
export async function resolveWebWorkspace(
  uid: string,
  token?: DecodedIdToken | null
): Promise<WebWorkspace> {
  const [adminDoc, commandCenterDoc, adminByEmail, superAdminClaim] = await Promise.all([
    isAdmin(uid),
    isCommandCenterAccount(uid),
    isAdminByEmail(token?.email),
    Promise.resolve(superAdminFromClaims(token)),
  ])

  const isSuperAdmin = adminDoc || adminByEmail || superAdminClaim

  if (isSuperAdmin && commandCenterDoc) {
    console.warn(
      '[workspace] UID exists in both admins and commandCenters; super_admin takes precedence',
      uid
    )
  }

  if (isSuperAdmin) return 'super_admin'
  if (commandCenterDoc) return 'command_center'
  if (commandCenterFromClaims(token)) return 'command_center'
  return 'unauthorized'
}
