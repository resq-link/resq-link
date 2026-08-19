import { getOtpApiUrl, apiConfig } from "@/services/api";

export async function sendEmailOtp({ uid, email }) {
  const response = await fetch(getOtpApiUrl(apiConfig.endpoints.emailOtpSend), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, email }),
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
  const response = await fetch(getOtpApiUrl(apiConfig.endpoints.emailOtpVerify), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
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

export function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at < 1) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const visible = local.slice(0, 1);
  return `${visible}***${domain}`;
}
