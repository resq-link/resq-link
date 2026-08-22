/** Public legal document URLs (hosted on the unified web app). */
export const LEGAL_BASE_URL =
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL || "https://www.resq-link.com";

export const LEGAL_URLS = {
  privacyPolicy: `${LEGAL_BASE_URL}/privacy-policy`,
  dataPrivacyNotice: `${LEGAL_BASE_URL}/data-privacy`,
  termsOfUse: `${LEGAL_BASE_URL}/terms-of-use`,
  contact: `${LEGAL_BASE_URL}/contact`,
};

export const PRIVACY_CONTACT_EMAIL = "mvgumabay@spup.edu.ph";
export const SUPPORT_CONTACT_EMAIL = "mvgumabay@spup.edu.ph";
