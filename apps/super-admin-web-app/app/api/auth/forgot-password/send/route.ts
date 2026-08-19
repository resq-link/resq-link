import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import * as admin from 'firebase-admin';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';
import { sendOtpEmail } from '@/lib/resend';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    let uid = '';
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
      }
      throw error;
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
    }
    const role = String(userSnap.data()?.role || '').toLowerCase();
    if (role && role !== 'civilian') {
      return NextResponse.json({ error: 'This email is not a civilian account.' }, { status: 400 });
    }

    const otpRef = db.doc(`passwordResetOtps/${emailOtpDocId(email)}`);
    const existing = await otpRef.get();
    const lastSentAt = existing.data()?.lastSentAt?.toMillis?.() ?? existing.data()?.lastSentAt ?? 0;
    if (lastSentAt && Date.now() - Number(lastSentAt) < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    const otp = String(randomInt(100000, 1000000));
    const now = Date.now();
    await otpRef.set({
      otp,
      uid,
      email,
      expiresAt: now + OTP_TTL_MS,
      lastSentAt: now,
    });

    await sendOtpEmail(email, otp);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
