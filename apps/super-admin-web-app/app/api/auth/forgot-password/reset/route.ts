import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { emailOtpDocId, getAdminFirestore } from '@packages/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Email and 6-digit code are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const otpRef = db.doc(`passwordResetOtps/${emailOtpDocId(email)}`);
    const snap = await otpRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'No reset code found. Request a new one.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Invalid reset record' }, { status: 400 });
    }

    await admin.auth().updateUser(uid, { password: newPassword });
    await otpRef.delete();

    return NextResponse.json({ success: true, uid });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
