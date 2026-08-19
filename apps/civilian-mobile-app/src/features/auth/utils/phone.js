const PH_MOBILE = /^(?:\+63|0)9\d{9}$/;

export function normalizePhilippinePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+63${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("09")) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("63")) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("630")) {
    return `+63${digits.slice(3)}`;
  }
  return raw?.trim() || "";
}

export function isValidPhilippinePhone(raw) {
  const normalized = normalizePhilippinePhone(raw);
  return PH_MOBILE.test(normalized.replace(/\s/g, ""));
}
