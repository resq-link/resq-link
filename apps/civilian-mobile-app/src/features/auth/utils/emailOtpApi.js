import { getOtpApiUrl, apiConfig } from '@/services/api';
import { toUserFacingNetworkError } from '@/features/auth/utils/networkErrors';

const REQUEST_TIMEOUT_MS = 30000;

async function postJson(url, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const err = new Error(data.error || 'Request failed.');
      if (typeof data.retryAfterSeconds === 'number') {
        err.retryAfterSeconds = data.retryAfterSeconds;
      }
      throw err;
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(toUserFacingNetworkError(new Error('timeout'), 'otp'));
    }
    if (typeof error?.retryAfterSeconds === 'number') {
      const wrapped = new Error(toUserFacingNetworkError(error, 'otp'));
      wrapped.retryAfterSeconds = error.retryAfterSeconds;
      throw wrapped;
    }
    throw new Error(toUserFacingNetworkError(error, 'otp'));
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendEmailOtp({ uid, email }) {
  return postJson(getOtpApiUrl(apiConfig.endpoints.emailOtpSend), { uid, email });
}

export async function verifyEmailOtp({ email, otp }) {
  return postJson(getOtpApiUrl(apiConfig.endpoints.emailOtpVerify), { email, otp });
}

export async function sendForgotPasswordOtp({ email }) {
  return postJson(getOtpApiUrl(apiConfig.endpoints.forgotPasswordSend), { email });
}

export async function resetPassword({ email, otp, newPassword }) {
  return postJson(getOtpApiUrl(apiConfig.endpoints.forgotPasswordReset), {
    email,
    otp,
    newPassword,
  });
}

export function maskEmail(email) {
  const value = String(email || '');
  const at = value.indexOf('@');
  if (at < 1) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const visible = local.slice(0, 1);
  return `${visible}***${domain}`;
}
