/**
 * RES.Q Responder dashboard palettes — paired with `useResqTheme().resolvedScheme`.
 * Deep Emergency Blue base + Bright Rescue Blue chrome (matches resqTokens).
 */

export const dashboardThemeDark = {
  bgTop: "#020814",
  bgMid: "#050D18",
  bgBottom: "#03060E",

  headerGlowTop: "rgba(30, 58, 110, 0.14)",
  headerGlowMid: "rgba(8, 16, 32, 0.88)",
  decorArc: "rgba(59, 130, 246, 0.14)",
  decorDot: "rgba(59, 130, 246, 0.28)",

  decorRadialStart: "rgba(59, 130, 246, 0.14)",
  decorRadialEnd: "rgba(4, 10, 22, 0)",
  identityShine: "rgba(22, 42, 78, 0.42)",

  surfaceCard: "#101B2E",
  surfaceCardInner: "#0C1628",
  borderSubtle: "rgba(71, 91, 122, 0.22)",
  borderAccent: "rgba(59, 130, 246, 0.30)",

  textPrimary: "#F5F7FA",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  accent: "#3B82F6",
  accentBright: "#60A5FA",
  accentSoft: "rgba(59, 130, 246, 0.14)",

  statActive: "#F59E0B",
  statResolved: "#22C55E",
  statOnline: "#3B82F6",

  statCardActiveTop: "rgba(245, 158, 11, 0.13)",
  statCardResolvedTop: "rgba(34, 197, 94, 0.09)",
  statCardOnlineTop: "rgba(59, 130, 246, 0.10)",
  statCardBottom: "rgba(8, 12, 22, 0.94)",

  chipBg: "rgba(59, 130, 246, 0.10)",
  chipBorder: "rgba(59, 130, 246, 0.24)",
  avatarBg: "rgba(30, 52, 88, 0.42)",
  avatarBorder: "rgba(59, 130, 246, 0.24)",

  liveDot: "#3B82F6",
  liveBorder: "rgba(59, 130, 246, 0.36)",

  emptyPulseFill: "rgba(59, 130, 246, 0.05)",
  emptyPulseStroke: "rgba(59, 130, 246, 0.22)",

  navBorder: "rgba(96, 165, 250, 0.32)",
  navActiveBg: "rgba(59, 130, 246, 0.16)",
  navGlassOverlay: "rgba(4, 10, 20, 0.94)",
  navAccent: "#60A5FA",

  divider: "rgba(51, 65, 95, 0.28)",

  visualScheme: "dark",
};

/** Light — Deep Emergency Blue type + Bright Rescue Blue chrome */
export const dashboardThemeLight = {
  bgTop: "#F4F7FC",
  bgMid: "#EEF2F7",
  bgBottom: "#E4EAF2",

  headerGlowTop: "rgba(37, 99, 235, 0.08)",
  headerGlowMid: "rgba(238, 242, 247, 0.96)",
  decorArc: "rgba(37, 99, 235, 0.14)",
  decorDot: "rgba(37, 99, 235, 0.26)",

  decorRadialStart: "rgba(37, 99, 235, 0.12)",
  decorRadialEnd: "rgba(248, 250, 252, 0)",
  identityShine: "rgba(255, 255, 255, 0.97)",

  surfaceCard: "#FFFFFF",
  surfaceCardInner: "#F8FAFC",
  borderSubtle: "rgba(15, 23, 42, 0.12)",
  borderAccent: "rgba(37, 99, 235, 0.28)",

  textPrimary: "#0B1220",
  textSecondary: "#475569",
  textMuted: "#64748B",

  accent: "#2563EB",
  accentBright: "#3B82F6",
  accentSoft: "rgba(37, 99, 235, 0.10)",

  statActive: "#D97706",
  statResolved: "#16A34A",
  statOnline: "#2563EB",

  statCardActiveTop: "#FFF8EB",
  statCardResolvedTop: "#F0FDF4",
  statCardOnlineTop: "#EFF6FF",
  statCardBottom: "#FFFFFF",

  statCardActiveIconBg: "rgba(217, 119, 6, 0.11)",
  statCardResolvedIconBg: "rgba(22, 163, 74, 0.11)",
  statCardOnlineIconBg: "rgba(37, 99, 235, 0.10)",

  chipBg: "rgba(37, 99, 235, 0.10)",
  chipBorder: "rgba(37, 99, 235, 0.22)",
  avatarBg: "rgba(11, 31, 58, 0.06)",
  avatarBorder: "rgba(37, 99, 235, 0.26)",

  liveDot: "#2563EB",
  liveBorder: "rgba(37, 99, 235, 0.32)",

  emptyPulseFill: "rgba(37, 99, 235, 0.05)",
  emptyPulseStroke: "rgba(37, 99, 235, 0.20)",

  navBorder: "rgba(37, 99, 235, 0.28)",
  navActiveBg: "rgba(37, 99, 235, 0.12)",
  navGlassOverlay: "rgba(255, 255, 255, 0.94)",
  navAccent: "#2563EB",

  divider: "rgba(15, 23, 42, 0.08)",

  visualScheme: "light",
};

/** Default dashboard chrome (dark); bottom nav matches dark branch */
export const dashboardTheme = dashboardThemeDark;
