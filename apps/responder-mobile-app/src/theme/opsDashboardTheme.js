/**
 * BFP × RES.Q dashboard palettes — paired with `useResqTheme().resolvedScheme`.
 * Dark: deep navy base + teal-green. Light: cool off-white + navy type + teal-green chrome.
 */

export const opsDashboardThemeDark = {
  bgTop: "#020814",
  bgMid: "#050D18",
  bgBottom: "#03060E",

  headerGlowTop: "rgba(30, 55, 100, 0.11)",
  headerGlowMid: "rgba(8, 16, 32, 0.88)",
  decorArc: "rgba(34, 176, 125, 0.11)",
  decorDot: "rgba(34, 176, 125, 0.22)",

  decorRadialStart: "rgba(34, 176, 125, 0.11)",
  decorRadialEnd: "rgba(4, 10, 22, 0)",
  identityShine: "rgba(22, 42, 78, 0.42)",

  surfaceCard: "#101B2E",
  surfaceCardInner: "#0C1628",
  borderSubtle: "rgba(71, 91, 122, 0.22)",
  borderAccent: "rgba(34, 176, 125, 0.26)",

  textPrimary: "#F5F7FA",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  accent: "#22B07D",
  accentBright: "#34D399",
  accentSoft: "rgba(34, 176, 125, 0.12)",

  statActive: "#D4654A",
  statResolved: "#4ADE80",
  statOnline: "#5EB8E0",

  statCardActiveTop: "rgba(212, 101, 74, 0.13)",
  statCardResolvedTop: "rgba(74, 222, 128, 0.09)",
  statCardOnlineTop: "rgba(94, 184, 224, 0.09)",
  statCardBottom: "rgba(8, 12, 22, 0.94)",

  chipBg: "rgba(34, 176, 125, 0.09)",
  chipBorder: "rgba(34, 176, 125, 0.22)",
  avatarBg: "rgba(30, 52, 88, 0.42)",
  avatarBorder: "rgba(34, 176, 125, 0.20)",

  liveDot: "#22B07D",
  liveBorder: "rgba(34, 176, 125, 0.32)",

  emptyPulseFill: "rgba(34, 176, 125, 0.045)",
  emptyPulseStroke: "rgba(34, 176, 125, 0.20)",

  /** Bottom nav — teal/green to match RES.Q logo mark */
  navBorder: "rgba(45, 212, 191, 0.35)",
  navActiveBg: "rgba(45, 212, 191, 0.14)",
  navGlassOverlay: "rgba(4, 12, 14, 0.94)",
  navAccent: "#5EEAD4",

  divider: "rgba(51, 65, 95, 0.28)",

  visualScheme: "dark",
};

/** Light — matches `lightResqTokens` BFP direction */
export const opsDashboardThemeLight = {
  bgTop: "#F4F8FD",
  bgMid: "#E8EEF7",
  bgBottom: "#DFE7F4",

  headerGlowTop: "rgba(20, 184, 166, 0.07)",
  headerGlowMid: "rgba(232, 238, 247, 0.96)",
  decorArc: "rgba(20, 184, 166, 0.14)",
  decorDot: "rgba(20, 184, 166, 0.26)",

  decorRadialStart: "rgba(20, 184, 166, 0.14)",
  decorRadialEnd: "rgba(248, 250, 252, 0)",
  identityShine: "rgba(255, 255, 255, 0.97)",

  surfaceCard: "#FFFFFF",
  surfaceCardInner: "#F8FAFC",
  borderSubtle: "rgba(15, 23, 42, 0.12)",
  borderAccent: "rgba(20, 184, 166, 0.28)",

  textPrimary: "#0B1220",
  textSecondary: "#475569",
  textMuted: "#64748B",

  accent: "#14B8A6",
  accentBright: "#2DD4BF",
  accentSoft: "rgba(20, 184, 166, 0.11)",

  statActive: "#C2410C",
  statResolved: "#15803D",
  statOnline: "#0369A1",

  /** Solid-tint tops read clearly on light gray page (avoid faint rgba → “invisible” gradients) */
  statCardActiveTop: "#FFF5F0",
  statCardResolvedTop: "#F0FDF4",
  statCardOnlineTop: "#EFF6FF",
  statCardBottom: "#FFFFFF",

  /** Icon wells on light stat cards (Operational clarity + depth) */
  statCardActiveIconBg: "rgba(194, 65, 12, 0.11)",
  statCardResolvedIconBg: "rgba(21, 128, 61, 0.11)",
  statCardOnlineIconBg: "rgba(3, 105, 161, 0.10)",

  chipBg: "rgba(20, 184, 166, 0.10)",
  chipBorder: "rgba(20, 184, 166, 0.22)",
  avatarBg: "rgba(19, 42, 74, 0.06)",
  avatarBorder: "rgba(20, 184, 166, 0.26)",

  liveDot: "#14B8A6",
  liveBorder: "rgba(20, 184, 166, 0.32)",

  emptyPulseFill: "rgba(20, 184, 166, 0.05)",
  emptyPulseStroke: "rgba(20, 184, 166, 0.20)",

  navBorder: "rgba(13, 148, 136, 0.30)",
  navActiveBg: "rgba(45, 212, 191, 0.14)",
  navGlassOverlay: "rgba(255, 255, 255, 0.94)",
  navAccent: "#0D9488",

  divider: "rgba(15, 23, 42, 0.08)",

  visualScheme: "light",
};

/** @deprecated Prefer `opsDashboardThemeDark`; used by bottom nav (dark branch) for stable import */
export const opsDashboardTheme = opsDashboardThemeDark;
