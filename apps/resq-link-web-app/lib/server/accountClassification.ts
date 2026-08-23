import { getAdminAuth, getAdminFirestore, isAdmin } from '@packages/firebase/admin';
import type { ManagedAccountType } from '@/lib/accountTypes';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Canonical platform roles used by Super Admin account management. */
export type CanonicalAccountRole =
  | 'dispatcher'
  | 'responder'
  | 'civilian'
  | 'command_center'
  | 'super_admin'
  | 'unknown';

export const PROTECTED_ACCOUNT_EMAILS = new Set([
  'command@rescue.ph',
  'superadmin@spup.com',
]);

const ROLE_ALIASES: Record<string, CanonicalAccountRole> = {
  civilian: 'civilian',
  user: 'civilian',
  citizen: 'civilian',
  responder: 'responder',
  dispatcher: 'dispatcher',
  command_center: 'command_center',
  commandcenter: 'command_center',
  command: 'command_center',
  command_admin: 'command_center',
  command_center_admin: 'command_center',
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  platform_admin: 'super_admin',
};

export function normalizeRoleValue(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function mapRoleAlias(value: unknown): CanonicalAccountRole | null {
  const normalized = normalizeRoleValue(value);
  if (!normalized) return null;
  return ROLE_ALIASES[normalized] || null;
}

export function isProtectedAccountEmail(email: string | null | undefined): boolean {
  const normalized = asString(email).toLowerCase();
  return Boolean(normalized) && PROTECTED_ACCOUNT_EMAILS.has(normalized);
}

export function expectedRoleForAccountType(accountType: ManagedAccountType): CanonicalAccountRole {
  if (accountType === 'dispatcher' || accountType === 'command_center') return 'command_center';
  if (accountType === 'responder') return 'responder';
  return 'civilian';
}

export function humanRoleLabel(role: CanonicalAccountRole): string {
  switch (role) {
    case 'command_center':
    case 'dispatcher':
      return 'Dispatcher';
    case 'responder':
      return 'Responder';
    case 'civilian':
      return 'Civilian';
    case 'super_admin':
      return 'Super Admin';
    default:
      return 'Unknown / Requires Review';
  }
}

/**
 * Detect the authoritative account kind for a UID by checking operational collections first.
 * Never infer civilian from a missing role alone.
 */
export async function detectCanonicalAccountRole(uid: string): Promise<{
  role: CanonicalAccountRole;
  collection: 'admins' | 'commandCenters' | 'dispatchers' | 'users' | null;
  email: string | null;
  designation: string | null;
}> {
  const db = getAdminFirestore();
  const [adminDoc, commandSnap, dispatcherSnap, userSnap, adminByIsAdmin] = await Promise.all([
    db.doc(`admins/${uid}`).get(),
    db.doc(`commandCenters/${uid}`).get(),
    db.doc(`dispatchers/${uid}`).get(),
    db.doc(`users/${uid}`).get(),
    isAdmin(uid),
  ]);

  if (adminDoc.exists || adminByIsAdmin) {
    const email = asString(adminDoc.data()?.email) || null;
    return { role: 'super_admin', collection: 'admins', email, designation: null };
  }

  if (commandSnap.exists && commandSnap.data()?.deleted !== true) {
    const data = commandSnap.data() || {};
    return {
      role: 'command_center',
      collection: 'commandCenters',
      email: asString(data.email) || null,
      designation: null,
    };
  }

  if (dispatcherSnap.exists && dispatcherSnap.data()?.deleted !== true) {
    const data = dispatcherSnap.data() || {};
    const designation = asString(data.designation);
    const responder = designation.toLowerCase().includes('responder');
    return {
      role: responder ? 'responder' : 'dispatcher',
      collection: 'dispatchers',
      email: asString(data.email) || null,
      designation: designation || null,
    };
  }

  if (userSnap.exists && userSnap.data()?.deleted !== true) {
    const data = userSnap.data() || {};
    const mapped = mapRoleAlias(data.role);
    const email = asString(data.email) || null;
    // Explicit civilian only. Legacy roles in `users` (command, agency codes, missing)
    // are unknown and must never be managed as civilians.
    if (mapped === 'civilian') {
      return { role: 'civilian', collection: 'users', email, designation: null };
    }
    return { role: 'unknown', collection: 'users', email, designation: null };
  }

  try {
    const authUser = await getAdminAuth().getUser(uid);
    const claimRole = mapRoleAlias(
      (authUser.customClaims as { role?: unknown } | undefined)?.role
    );
    return {
      role: claimRole || 'unknown',
      collection: null,
      email: authUser.email || null,
      designation: null,
    };
  } catch {
    return { role: 'unknown', collection: null, email: null, designation: null };
  }
}

export function assertExpectedAccountRole(
  detected: CanonicalAccountRole,
  expectedType: ManagedAccountType
): void {
  const expected = expectedRoleForAccountType(expectedType);

  if (detected === 'unknown') {
    throw Object.assign(
      new Error(
        'Deletion blocked: this account has an unknown or missing role and cannot be managed until it is reviewed.'
      ),
      { status: 409, code: 'ACCOUNT_ACTION_BLOCKED_UNKNOWN_ROLE' }
    );
  }

  if (expectedType === 'civilian' && detected !== 'civilian') {
    throw Object.assign(
      new Error(
        `Deletion blocked: this account is not registered as a civilian (detected: ${humanRoleLabel(detected)}).`
      ),
      {
        status: 409,
        code: 'ACCOUNT_ACTION_BLOCKED_ROLE_MISMATCH',
        details: { detectedRole: detected, expectedRole: 'civilian' },
      }
    );
  }

  if (expectedType === 'responder' && detected !== 'responder') {
    throw Object.assign(
      new Error(
        `Action blocked: this account is not registered as a responder (detected: ${humanRoleLabel(detected)}).`
      ),
      {
        status: 409,
        code: 'ACCOUNT_ACTION_BLOCKED_ROLE_MISMATCH',
        details: { detectedRole: detected, expectedRole: 'responder' },
      }
    );
  }

  if (
    (expectedType === 'dispatcher' || expectedType === 'command_center') &&
    detected !== 'command_center' &&
    detected !== 'dispatcher'
  ) {
    throw Object.assign(
      new Error(
        `Action blocked: this account is not registered as a dispatcher (detected: ${humanRoleLabel(detected)}).`
      ),
      {
        status: 409,
        code: 'ACCOUNT_ACTION_BLOCKED_ROLE_MISMATCH',
        details: { detectedRole: detected, expectedRole: expected },
      }
    );
  }
}

export async function assertDestructiveAccountActionAllowed(input: {
  uid: string;
  accountType: ManagedAccountType;
  action: 'disable' | 'enable' | 'delete' | 'reset_password' | 'update';
}): Promise<{
  detectedRole: CanonicalAccountRole;
  email: string | null;
}> {
  const detected = await detectCanonicalAccountRole(input.uid);

  if (detected.role === 'super_admin') {
    throw Object.assign(
      new Error('Super administrator accounts cannot be modified from this console.'),
      { status: 400, code: 'ACCOUNT_ACTION_BLOCKED_PROTECTED' }
    );
  }

  assertExpectedAccountRole(detected.role, input.accountType);

  const email = detected.email;
  if (
    input.action === 'delete' &&
    isProtectedAccountEmail(email)
  ) {
    throw Object.assign(
      new Error(
        `Deletion blocked: ${email} is a protected operational account and cannot be deleted from Super Admin.`
      ),
      {
        status: 409,
        code: 'ACCOUNT_ACTION_BLOCKED_PROTECTED',
        details: { email, detectedRole: detected.role },
      }
    );
  }

  return { detectedRole: detected.role, email };
}

/** True when a Firestore users doc is an explicit, listable civilian. */
export function isExplicitCivilianUserDoc(data: Record<string, unknown>): boolean {
  if (data.deleted === true) return false;
  return mapRoleAlias(data.role) === 'civilian';
}
