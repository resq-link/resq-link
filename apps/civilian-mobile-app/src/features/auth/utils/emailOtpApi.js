import { getOtpApiUrl, apiConfig } from "@/services/api";

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error?.message || "";
    if (/network request failed|failed to fetch|could not connect|network error/i.test(message)) {
      throw new Error(
        "Could not reach the RESQ-Link server. Check your internet connection and try again."
      );
    }
    throw error;
  }
  return response;
}

export async function sendEmailOtp({ uid, email }) {
  const response = await postJson(getOtpApiUrl(apiConfig.endpoints.emailOtpSend), {
    uid,
    email,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Failed to send verification email.");
  }
  return data;
}

export async function verifyEmailOtp({ email, otp }) {
  const response = await postJson(getOtpApiUrl(apiConfig.endpoints.emailOtpVerify), {
    email,
    otp,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Verification failed.");
  }
  return data;
}

export async function sendForgotPasswordOtp({ email }) {
  const response = await postJson(getOtpApiUrl(apiConfig.endpoints.forgotPasswordSend), {
    email,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Failed to send reset code.");
  }
  return data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const response = await postJson(getOtpApiUrl(apiConfig.endpoints.forgotPasswordReset), {
    email,
    otp,
    newPassword,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Failed to reset password.");
  }
  return data;
}

export function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at < 1) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const visible = local.slice(0, 1);
  return `${visible}***${domain}`;
}
