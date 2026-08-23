import { NextRequest, NextResponse } from 'next/server';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';
import * as admin from 'firebase-admin';
import { recordAdminEvent } from '@/lib/server/adminEvents';
import { routes } from '@/lib/routes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Email and 6-digit code are required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const otpRef = db.doc(`emailOtps/${emailOtpDocId(email)}`);
    const snap = await otpRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'No verification code found. Request a new one.' }, { status: 400 });
    }

    const data = snap.data() || {};
    if (String(data.otp) !== otp) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }
    if (Number(data.expiresAt) < Date.now()) {
      await otpRef.delete();
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    const uid = String(data.uid || '');
    if (!uid) {
      return NextResponse.json({ error: 'Invalid OTP record' }, { status: 400 });
    }

    const priorSnap = await db.doc(`users/${uid}`).get();
    const priorData = priorSnap.data() || {};
    const priorStatus = typeof priorData.status === 'string' ? priorData.status : '';
    const isResubmission = priorStatus === 'rejected';

    await db.doc(`users/${uid}`).set(
      {
        status: 'pending_kyc_review',
        kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await otpRef.delete();

    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data() || {};
    const displayName =
      (typeof userData.name === 'string' && userData.name.trim()) ||
      [userData.firstName, userData.lastName].filter((part) => typeof part === 'string' && part.trim()).join(' ') ||
      email;

    const notifyType = isResubmission ? 'kyc.resubmitted' : 'kyc.submitted';
    await recordAdminEvent({
      audit: {
        actorUid: uid,
        actorEmail: email,
        action: isResubmission ? 'kyc.resubmit' : 'kyc.submit',
        targetUid: uid,
        targetLabel: displayName,
        targetCollection: 'users',
        metadata: { source: 'email_otp_verify' },
      },
      notification: {
        type: notifyType,
        title: isResubmission ? 'KYC resubmitted' : 'New KYC submission',
        message: isResubmission
          ? `${displayName} resubmitted documents for verification.`
          : `${displayName} submitted documents for verification.`,
        targetUrl: routes.admin.kyc,
        targetId: uid,
        eventKey: `${notifyType}:${uid}:${Date.now()}`,
      },
    });

    return NextResponse.json({ success: true, uid });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
