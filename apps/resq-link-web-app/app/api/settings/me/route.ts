import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { toIso } from '@/lib/server/timestamps';
import { publicErrorMessage } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const [userRecord, adminSnap] = await Promise.all([
      getAdminAuth().getUser(auth.auth.uid),
      getAdminFirestore().doc(`admins/${auth.auth.uid}`).get(),
    ]);

    const adminData = adminSnap.exists ? adminSnap.data() || {} : {};
    const displayName =
      (typeof adminData.displayName === 'string' && adminData.displayName.trim()) ||
      userRecord.displayName ||
      'Super Administrator';

    return NextResponse.json({
      uid: auth.auth.uid,
      email: userRecord.email || auth.auth.email || null,
      displayName,
      role: 'Super Administrator',
      lastSignInAt: toIso(userRecord.metadata.lastSignInTime || null),
      createdAt: toIso(userRecord.metadata.creationTime || null),
      emailEditable: false,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load account settings.') },
      { status: 500 }
    );
  }
}
