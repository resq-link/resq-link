/**
 * Firebase Admin SDK - SERVER ONLY
 * Use only in Next.js API routes, server actions, or scripts.
 * Never import in client bundles.
 */

import * as admin from 'firebase-admin';

// Initialize Admin SDK
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
      return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Must be valid JSON or base64-encoded JSON.');
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  throw new Error(
    'Firebase Admin SDK needs credentials. Add to apps/resq-link-web-app/.env.local:\n' +
    '  GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json\n' +
    '  OR FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
    'Get the key from Firebase Console → Project Settings → Service Accounts → Generate new private key.'
  );
}

function adminAuth() {
  return getAdminApp().auth();
}

function adminFirestore() {
  return getAdminApp().firestore();
}

export interface CreateDispatcherInput {
  fullName?: string;
  email: string;
  password: string;
  /** Legacy agency code stored on `dispatchers.role` (e.g. BFP). */
  role: string;
  designation?: string | null;
  teamCode?: string | null;
  teamLabel?: string | null;
}

export interface CreateCommandCenterInput {
  email: string;
  password: string;
  name: string;
  location: string;
}

export interface CreateCivilianInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  address?: string;
}

/**
 * Create a dispatcher account using Admin SDK (server-side only)
 */
export async function createDispatcherAccountAdmin(input: CreateDispatcherInput): Promise<{ uid: string }> {
  const {
    email,
    password,
    role,
    fullName = '',
    designation = 'dispatcher',
    teamCode = null,
    teamLabel = null,
  } = input;
  const userRecord = await adminAuth().createUser({ email, password });
  await adminFirestore().doc(`dispatchers/${userRecord.uid}`).set({
    fullName,
    email,
    role,
    designation,
    teamCode,
    teamLabel,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const claimRole = String(designation || 'dispatcher').toLowerCase().includes('responder')
    ? 'responder'
    : 'dispatcher';
  await setRoleClaimsSafe(userRecord.uid, { role: claimRole, agency: role });
  return { uid: userRecord.uid };
}

/**
 * Create a command center account using Admin SDK (server-side only)
 */
export async function createCommandCenterAccountAdmin(input: CreateCommandCenterInput): Promise<{ uid: string }> {
  const { email, password, name, location } = input;
  const userRecord = await adminAuth().createUser({ email, password });
  await adminFirestore().doc(`commandCenters/${userRecord.uid}`).set({
    email,
    name,
    location,
    disabled: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await setRoleClaimsSafe(userRecord.uid, { role: 'command_center' });
  return { uid: userRecord.uid };
}

/**
 * Create a civilian account using Admin SDK (server-side only)
 * Civilians with email/password can use the civilian mobile app
 */
export async function createCivilianAccountAdmin(input: CreateCivilianInput): Promise<{ uid: string }> {
  const { email, password, fullName, phone = '', address = '' } = input;
  const userRecord = await adminAuth().createUser({ email, password });
  await adminFirestore().doc(`users/${userRecord.uid}`).set({
    email,
    name: fullName,
    phone,
    address,
    role: 'civilian',
    status: 'active',
    disabled: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await setRoleClaimsSafe(userRecord.uid, { role: 'civilian' });
  return { uid: userRecord.uid };
}

/**
 * Check if a user UID exists in the admins collection
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const doc = await adminFirestore().doc(`admins/${uid}`).get();
  return doc.exists;
}

/**
 * Check if a user UID exists in the commandCenters collection.
 */
export async function isCommandCenterAccount(uid: string): Promise<boolean> {
  const doc = await adminFirestore().doc(`commandCenters/${uid}`).get();
  return doc.exists;
}

/**
 * Verify ID token and return decoded claims.
 * Use to authenticate API requests from the client.
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  return adminAuth().verifyIdToken(token);
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return adminFirestore();
}

export function getAdminAuth(): admin.auth.Auth {
  return adminAuth();
}

export function emailOtpDocId(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_');
}

export type PlatformRole = 'super_admin' | 'command_center' | 'dispatcher' | 'responder' | 'civilian';

export type AuditAction =
  | 'account.create.dispatcher'
  | 'account.create.responder'
  | 'account.create.civilian'
  | 'account.create.command_center'
  | 'account.disable'
  | 'account.enable'
  | 'account.delete'
  | 'account.update_staff'
  | 'account.reset_password'
  | 'account.role_updated'
  | 'command_center.update'
  | 'kyc.approve'
  | 'kyc.reject'
  | 'kyc.submit'
  | 'kyc.resubmit'
  | 'agency.create'
  | 'agency.update'
  | 'agency.disable'
  | 'agency.enable'
  | 'agency.delete'
  | 'notification.delete'
  | 'admin.profile.update'
  | 'admin.password.change'
  | 'advisory.create'
  | 'advisory.update'
  | 'advisory.delete'
  | 'advisory.broadcast';

export interface WriteAuditLogInput {
  actorUid: string;
  actorEmail?: string | null;
  action: AuditAction;
  targetUid?: string | null;
  targetLabel?: string | null;
  targetCollection?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      next[key] = entry;
    }
  }
  return next as T;
}

async function setRoleClaimsSafe(
  uid: string,
  claims: { role: PlatformRole; agency?: string }
): Promise<void> {
  try {
    const existing = await adminAuth().getUser(uid);
    const previous = (existing.customClaims || {}) as Record<string, unknown>;
    const nextClaims: Record<string, unknown> = {
      ...previous,
      role: claims.role,
      agency: claims.agency,
    };
    if (claims.role === 'super_admin') {
      nextClaims.isSuperAdmin = true;
    } else if ('isSuperAdmin' in nextClaims) {
      delete nextClaims.isSuperAdmin;
    }
    await adminAuth().setCustomUserClaims(uid, stripUndefined(nextClaims));
  } catch (error) {
    console.error('Failed to set custom claims', { uid, error });
  }
}

export async function setAccountRoleClaims(
  uid: string,
  claims: { role: PlatformRole; agency?: string }
): Promise<void> {
  await setRoleClaimsSafe(uid, claims);
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<string> {
  const ref = await adminFirestore().collection('auditLogs').add(
    stripUndefined({
      actorUid: input.actorUid,
      actorEmail: input.actorEmail || null,
      action: input.action,
      targetUid: input.targetUid || null,
      targetLabel: input.targetLabel || null,
      targetCollection: input.targetCollection || null,
      reason: input.reason || null,
      metadata: input.metadata || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  );
  return ref.id;
}
