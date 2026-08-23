import { NextRequest, NextResponse } from 'next/server';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';
import { sendOtpEmail } from '@/lib/resend';
import {
  EMAIL_OTP_TTL_MS,
  emailOtpRetryAfterSeconds,
  generateEmailOtp,
  hashEmailOtp,
} from '@/lib/server/emailOtp';

const ALLOWED_STATUSES = new Set(['pending_email_verification']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!uid || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'uid and a valid email are required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const otpRef = db.doc(`emailOtps/${emailOtpDocId(email)}`);
    const existing = await otpRef.get();
    const existingData = existing.data() || {};
    const lastSentAt =
      existingData.lastSentAt?.toMillis?.() ?? Number(existingData.lastSentAt || 0);
    const retryAfterSeconds = emailOtpRetryAfterSeconds(lastSentAt);
    if (retryAfterSeconds > 0) {
      return NextResponse.json(
        {
          error: 'Please wait before requesting another code.',
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const userEmail = String(userData.email || '').trim().toLowerCase();
    if (userEmail !== email) {
      return NextResponse.json({ error: 'Email does not match this account' }, { status: 400 });
    }

    const status = String(userData.status || '');
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'This account does not require email verification.' },
        { status: 400 }
      );
    }

    const otp = generateEmailOtp();
    const now = Date.now();
    await otpRef.set({
      hashedCode: hashEmailOtp(otp, email),
      uid,
      email,
      expiresAt: now + EMAIL_OTP_TTL_MS,
      lastSentAt: now,
      attemptCount: 0,
      used: false,
      createdAt: now,
    });

    await sendOtpEmail(email, otp);

    if (process.env.NODE_ENV === 'development') {
      console.info('[email-otp] verification code sent', { uid, email });
    }

    return NextResponse.json({ success: true, retryAfterSeconds: 60 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[email-otp] send failed:', msg);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
