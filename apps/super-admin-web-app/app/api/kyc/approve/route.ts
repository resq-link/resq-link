import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore, isAdmin, verifyIdToken } from '@packages/firebase/admin';
import { sendKycApprovedEmail } from '@/lib/resend';

async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) };
  }
  const decoded = await verifyIdToken(token);
  const adminCheck = await isAdmin(decoded.uid);
  if (!adminCheck) {
    return { error: NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 }) };
  }
  return { uid: decoded.uid };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
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
    await userRef.set(
      {
        status: 'active',
        kycReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        kycReviewedBy: auth.uid,
        kycRejectionReason: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof user.email === 'string' && user.email.includes('@')) {
      try {
        await sendKycApprovedEmail(user.email, user.name || user.firstName);
      } catch (emailError) {
        console.error('KYC approval email failed:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
