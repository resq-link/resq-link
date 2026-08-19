import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';
import { sendOtpEmail } from '@/lib/resend';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

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
    const lastSentAt = existing.data()?.lastSentAt?.toMillis?.() ?? existing.data()?.lastSentAt ?? 0;
    if (lastSentAt && Date.now() - Number(lastSentAt) < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    const userEmail = String(userSnap.data()?.email || '').trim().toLowerCase();
    if (userEmail !== email) {
      return NextResponse.json({ error: 'Email does not match this account' }, { status: 400 });
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
