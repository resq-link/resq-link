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
