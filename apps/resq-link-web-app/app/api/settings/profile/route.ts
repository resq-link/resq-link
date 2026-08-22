import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';

    if (!displayName) {
      return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
    }
    if (displayName.length > 80) {
      return NextResponse.json({ error: 'Display name must be 80 characters or fewer.' }, { status: 400 });
    }

    const userRecord = await getAdminAuth().getUser(auth.auth.uid);
    const previousName = userRecord.displayName || '';

    if (previousName === displayName) {
      return NextResponse.json({ success: true, displayName, unchanged: true });
    }

    await getAdminAuth().updateUser(auth.auth.uid, { displayName });
    await getAdminFirestore()
      .doc(`admins/${auth.auth.uid}`)
      .set(
        {
          displayName,
          email: userRecord.email || auth.auth.email || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'admin.profile.update',
      targetUid: auth.auth.uid,
      targetLabel: displayName,
      targetCollection: 'admins',
      metadata: {
        changes: {
          displayName: { from: previousName || null, to: displayName },
        },
      },
    });

    return NextResponse.json({ success: true, displayName });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to update account information.') },
      { status: 500 }
    );
  }
}
