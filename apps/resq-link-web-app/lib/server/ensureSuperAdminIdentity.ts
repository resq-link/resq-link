import 'server-only';

import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore, setAccountRoleClaims } from '@packages/firebase/admin';

/**
 * Aligns Super Admin identity for Firestore client rules + notification fan-out.
 *
 * Server workspace resolution accepts `admins/{uid}`, admin email match, or claims.
 * Client `onSnapshot` rules need either `admins/{uid}` or Auth claims. Email-only
 * Super Admins therefore fail LIST on `adminNotifications` until this runs.
 */
export async function ensureSuperAdminIdentity(
  uid: string,
  email?: string | null
): Promise<{ ensuredDoc: boolean; claimsUpdated: boolean }> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const ref = db.doc(`admins/${uid}`);
  const snap = await ref.get();

  let ensuredDoc = false;
  const normalizedEmail =
    typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;

  if (!snap.exists) {
    await ref.set(
      {
        email: normalizedEmail,
        role: 'super_admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        provisionedBy: 'session_ensure',
      },
      { merge: true }
    );
    ensuredDoc = true;
  } else if (normalizedEmail && snap.data()?.email !== normalizedEmail) {
    await ref.set(
      {
        email: normalizedEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  let claimsUpdated = false;
  try {
    const user = await auth.getUser(uid);
    const previous = (user.customClaims || {}) as Record<string, unknown>;
    const role = typeof previous.role === 'string' ? previous.role.toLowerCase() : '';
    const needsClaims =
      previous.isSuperAdmin !== true ||
      !['super_admin', 'superadmin', 'platform_admin'].includes(role);

    if (needsClaims) {
      await setAccountRoleClaims(uid, { role: 'super_admin' });
      claimsUpdated = true;
    }
  } catch (error) {
    console.error('Failed to ensure Super Admin claims', { uid, error });
  }

  return { ensuredDoc, claimsUpdated };
}
