export function titleCaseWords(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatResponderName(email) {
  if (!email) return "Responder";
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, " ").trim();
  const words = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return titleCaseWords(words.join(" "));
  if (words.length === 1) return titleCaseWords(words[0]);
  return "Responder";
}

/**
 * Avatar initials (max 2).
 */
export function initialsFromEmail(email) {
  if (!email) return "R";
  const local = email.split("@")[0] || "";
  const dot = local.indexOf(".");
  if (dot > 0) {
    const a = local.charAt(0).toUpperCase();
    const afterDot = local.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "");
    const b = afterDot.charAt(0).toUpperCase();
    return (a + (b || a)).slice(0, 2);
  }
  const alnum = local.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) {
    return alnum.slice(0, 2).toUpperCase();
  }
  if (alnum.length === 1) {
    const c = alnum.charAt(0).toUpperCase();
    return (c + c).slice(0, 2);
  }
  return "R";
}

const RESOURCE_ROLE_LABELS = {
  BFP: "BFP Responder",
  AMBULANCE: "Ambulance Responder",
  PNP: "PNP Responder",
  MDRRMO: "MDRRMO Responder",
  PCG: "PCG Responder",
  OTHER: "Responder",
};

/** Display label for the responder's operational role (from crewed unit when available). */
export function getResponderRoleLabel(activeResource) {
  const type = activeResource?.type;
  if (!type) return "Responder";
  return RESOURCE_ROLE_LABELS[type] || "Responder";
}

/**
 * Initials for compact avatar (max 2 characters).
 * Supports multi-word names, single names, and email fallback.
 */
export function getResponderInitials({ email, displayName } = {}) {
  const name = (displayName || formatResponderName(email || "")).trim();
  if (!name || name === "Responder") {
    return initialsFromEmail(email);
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0].replace(/[^a-zA-Z0-9]/g, "");
    const last = words[words.length - 1].replace(/[^a-zA-Z0-9]/g, "");
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
  }

  const single = words[0]?.replace(/[^a-zA-Z0-9]/g, "") || "";
  if (single.length >= 2) return single.slice(0, 2).toUpperCase();
  if (single.length === 1) return `${single.charAt(0)}${single.charAt(0)}`.toUpperCase();

  return initialsFromEmail(email);
}
