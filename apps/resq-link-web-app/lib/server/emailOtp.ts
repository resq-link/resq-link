import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

export function generateEmailOtp(): string {
  return String(randomInt(100000, 1000000));
}

export function hashEmailOtp(otp: string, email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash('sha256').update(`${normalized}:${otp}`).digest('hex');
}

export function verifyEmailOtpHash(otp: string, email: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const computed = hashEmailOtp(otp, email);
  try {
    return timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(storedHash, 'utf8'));
  } catch {
    return false;
  }
}

export function emailOtpRetryAfterSeconds(lastSentAt: number, now = Date.now()): number {
  if (!lastSentAt) return 0;
  const elapsed = now - Number(lastSentAt);
  if (elapsed >= EMAIL_OTP_RESEND_COOLDOWN_MS) return 0;
  return Math.ceil((EMAIL_OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
}
