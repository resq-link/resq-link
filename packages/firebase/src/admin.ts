/**
 * Firebase Admin SDK - SERVER ONLY
 * Use only in Next.js API routes, server actions, or scripts.
 * Never import in client bundles.
 */

import * as admin from 'firebase-admin';
import type { DispatcherRole } from './auth';

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
    'Firebase Admin SDK needs credentials. Add to apps/super-admin-web-app/.env.local:\n' +
    '  GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json\n' +
    '  OR FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
    'Get the key from Firebase Console → Project Settings → Service Accounts → Generate new private key.'
  );
}

const adminApp = getAdminApp();
const adminAuth = adminApp.auth();
const adminFirestore = adminApp.firestore();

export interface CreateDispatcherInput {
  fullName?: string;
  email: string;
  password: string;
  role: DispatcherRole;
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
  const userRecord = await adminAuth.createUser({ email, password });
  await adminFirestore.doc(`dispatchers/${userRecord.uid}`).set({
    fullName,
    email,
    role,
    designation,
    teamCode,
    teamLabel,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { uid: userRecord.uid };
}

/**
 * Create a command center account using Admin SDK (server-side only)
 */
export async function createCommandCenterAccountAdmin(input: CreateCommandCenterInput): Promise<{ uid: string }> {
  const { email, password, name, location } = input;
  const userRecord = await adminAuth.createUser({ email, password });
  await adminFirestore.doc(`commandCenters/${userRecord.uid}`).set({
    email,
    name,
    location,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { uid: userRecord.uid };
}

/**
 * Create a civilian account using Admin SDK (server-side only)
 * Civilians with email/password can use the civilian mobile app
 */
export async function createCivilianAccountAdmin(input: CreateCivilianInput): Promise<{ uid: string }> {
  const { email, password, fullName, phone = '', address = '' } = input;
  const userRecord = await adminAuth.createUser({ email, password });
  await adminFirestore.doc(`users/${userRecord.uid}`).set({
    email,
    name: fullName,
    phone,
    address,
    role: 'civilian',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { uid: userRecord.uid };
}

/**
 * Check if a user UID exists in the admins collection
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const doc = await adminFirestore.doc(`admins/${uid}`).get();
  return doc.exists;
}

/**
 * Check if a user UID exists in the commandCenters collection.
 */
export async function isCommandCenterAccount(uid: string): Promise<boolean> {
  const doc = await adminFirestore.doc(`commandCenters/${uid}`).get();
  return doc.exists;
}

/**
 * Verify ID token and return decoded claims.
 * Use to authenticate API requests from the client.
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  return adminAuth.verifyIdToken(token);
}
