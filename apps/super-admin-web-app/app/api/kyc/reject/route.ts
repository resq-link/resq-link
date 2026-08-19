import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore, isAdmin, verifyIdToken } from '@packages/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    const adminCheck = await isAdmin(decoded.uid);
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.set(
      {
        status: 'rejected',
        kycReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        kycReviewedBy: decoded.uid,
        kycRejectionReason: reason || 'KYC documents were not accepted.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
