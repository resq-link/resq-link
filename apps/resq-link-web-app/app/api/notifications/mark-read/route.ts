import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const markAll = Boolean(body.all);

    if (!id && !markAll) {
      return NextResponse.json({ error: 'Provide notification id or all=true' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const uid = auth.auth.uid;

    if (markAll) {
      const snap = await db
        .collection('adminNotifications')
        .where('recipientUid', '==', uid)
        .where('read', '==', false)
        .limit(200)
        .get();

      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((doc) => {
          batch.set(
            doc.ref,
            {
              read: true,
              readAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        });
        await batch.commit();
      }

      return NextResponse.json({ success: true, updated: snap.size });
    }

    const ref = db.doc(`adminNotifications/${id}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    const data = snap.data() || {};
    if (data.recipientUid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ref.set(
      {
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, updated: 1 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to update notification.') },
      { status: 500 }
    );
  }
}
