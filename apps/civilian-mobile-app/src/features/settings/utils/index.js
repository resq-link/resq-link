export function getUserDisplayName(user) {
  if (!user) return "RESQ-Link User";
  return user.name || user.displayName || user.email?.split("@")[0] || "RESQ-Link User";
}

export function getUserInitials(user) {
  const name = getUserDisplayName(user);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Display phone with partial masking for privacy. */
export function formatDisplayPhone(user) {
  const raw = user?.phone_number || user?.phone || "";
  if (!raw) return "Phone not set";

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    const local = digits.startsWith("63") ? digits.slice(2) : digits;
    if (local.length >= 10) {
      const a = local.slice(0, 3);
      const b = local.slice(3, 6);
      return `+63 ${a} ${b} XXXX`;
    }
  }

  return raw;
}
