import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { asString } from '@/lib/server/accounts';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = snap.data() || {};
    const rejectionReason = reason || 'KYC documents were not accepted.';
    await userRef.set(
      {
        status: 'rejected',
        kycReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        kycReviewedBy: auth.auth.uid,
        kycRejectionReason: rejectionReason,
        ...(notes ? { kycReviewNotes: notes } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'kyc.reject',
      targetUid: uid,
      targetLabel: asString(user.name) || asString(user.email) || uid,
      targetCollection: 'users',
      reason: rejectionReason,
      metadata: { notes: notes || null },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to reject this application. Please try again.') },
      { status: 500 }
    );
  }
}
