import { NextRequest, NextResponse } from 'next/server';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';
import * as admin from 'firebase-admin';
import { recordAdminEvent } from '@/lib/server/adminEvents';
import { routes } from '@/lib/routes';
import { EMAIL_OTP_MAX_ATTEMPTS, verifyEmailOtpHash } from '@/lib/server/emailOtp';

const VERIFYABLE_STATUSES = new Set(['pending_email_verification', 'rejected']);

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
      return NextResponse.json(
        { error: 'No verification code found. Request a new one.' },
        { status: 400 }
      );
    }

    const data = snap.data() || {};
    if (data.used === true) {
      return NextResponse.json({ error: 'This code has already been used. Request a new one.' }, { status: 400 });
    }

    if (Number(data.expiresAt) < Date.now()) {
      await otpRef.delete();
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    const attemptCount = Number(data.attemptCount || 0);
    if (attemptCount >= EMAIL_OTP_MAX_ATTEMPTS) {
      await otpRef.delete();
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Request a new verification code.' },
        { status: 429 }
      );
    }

    const storedHash = String(data.hashedCode || data.otp || '');
    const otpMatches =
      data.hashedCode != null
        ? verifyEmailOtpHash(otp, email, storedHash)
        : storedHash === otp;

    if (!otpMatches) {
      const nextAttempts = attemptCount + 1;
      if (nextAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
        await otpRef.delete();
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Request a new verification code.' },
          { status: 429 }
        );
      }
      await otpRef.set({ attemptCount: nextAttempts }, { merge: true });
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    const uid = String(data.uid || '');
    if (!uid) {
      return NextResponse.json({ error: 'Invalid OTP record' }, { status: 400 });
    }

    const userRef = db.doc(`users/${uid}`);
    const priorSnap = await userRef.get();
    if (!priorSnap.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const priorData = priorSnap.data() || {};
    const priorStatus = typeof priorData.status === 'string' ? priorData.status : '';
    if (!VERIFYABLE_STATUSES.has(priorStatus)) {
      return NextResponse.json(
        { error: 'This account is not waiting for email verification.' },
        { status: 400 }
      );
    }

    const isResubmission = priorStatus === 'rejected';
    const hasKycDocuments = Boolean(String(priorData.govIdFrontUrl || '').trim());

    await userRef.set(
      {
        status: 'pending_kyc_review',
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(hasKycDocuments
          ? { kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp() }
          : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await otpRef.delete();

    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const displayName =
      (typeof userData.name === 'string' && userData.name.trim()) ||
      [userData.firstName, userData.lastName].filter((part) => typeof part === 'string' && part.trim()).join(' ') ||
      email;

    if (hasKycDocuments) {
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
    }

    return NextResponse.json({ success: true, uid, status: 'pending_kyc_review' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[email-otp] verify failed:', msg);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
