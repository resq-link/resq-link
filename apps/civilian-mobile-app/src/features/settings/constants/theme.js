/** Semantic tokens for Settings — light/dark via useAppTheme base colors. */
export const settingsIconAccents = {
  notifications: "#3B82F6",
  appearance: "#8B5CF6",
  privacy: "#10B981",
  help: "#F97316",
  faq: "#6366F1",
  reportIssue: "#EF4444",
  about: "#6B7280",
  logout: "#EF4444",
};

export const settingsTypography = {
  screenLabel: 13,
  sectionTitle: 13,
  rowTitle: 16,
  rowSubtitle: 12,
  statValue: 20,
  statLabel: 11,
  profileName: 20,
  profileMeta: 13,
  badge: 11,
};

export function createSettingsTheme(isLight, colors) {
  return {
    background: colors.background,
    card: colors.card,
    cardInner: colors.cardInner,
    border: colors.borderAlt ?? colors.border,
    separator: colors.separator,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.mutedIcon,
    verifiedBg: colors.primaryMuted,
    verifiedText: colors.secondaryGreen,
    onlineDot: "#34C759",
    avatarBg: isLight ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.18)",
    avatarIcon: isLight ? "#2563EB" : "#60A5FA",
    shadow: isLight ? "rgba(0, 0, 0, 0.08)" : "#000000",
    rowPressed: isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.06)",
    logoutBorder: isLight ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.45)",
    // Solid tints — avoids gray Pressable/elevation bleed-through on Android
    logoutBg: isLight ? "#FDEDED" : "#2A1818",
    logoutSubtitle: isLight ? "rgba(220, 38, 38, 0.72)" : "rgba(248, 113, 113, 0.85)",
    statIconBg: isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.06)",
    cardRadius: 20,
    rowMinHeight: 52,
  };
}
