import { Resend } from 'resend';

let client: Resend | null = null;

function getResend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured.');
    }
    client = new Resend(apiKey);
  }
  return client;
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'RESQ-Link <onboarding@resend.dev>';
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: 'Your RESQ-Link verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;color:#0B1220">Verify your email</h1>
        <p style="color:#475569">Use this code to finish creating your RESQ-Link civilian account:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#142A47">${otp}</p>
        <p style="color:#64748B;font-size:14px">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  });
  if (error) {
    throw new Error(error.message || 'Failed to send verification email.');
  }
}

export async function sendKycApprovedEmail(to: string, name?: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: 'Your RESQ-Link account is now verified',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;color:#0B1220">Your account is now verified</h1>
        <p style="color:#475569">Hi ${name || 'there'}, a super admin has verified your identity. Your RESQ-Link civilian account is now active and you can sign in to the app.</p>
      </div>
    `,
  });
  if (error) {
    throw new Error(error.message || 'Failed to send approval email.');
  }
}
