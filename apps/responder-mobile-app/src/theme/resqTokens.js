/**
 * RES.Q global design tokens — Dark & Light.
 * BFP-inspired: navy authority, teal-green identity; red/orange only for urgency & destructive paths.
 * Use via `useResqTheme().t` — keys are identical across modes for predictable theming.
 */

const statCardBottomDark = "rgba(7, 11, 22, 0.96)";
const statCardBottomLight = "rgba(248, 250, 252, 0.97)";

/** Logged-in BFP × RES.Q — dark: deep navy base, teal-green identity, measured alert tones. */
export const darkResqTokens = {
  // —— Foundation (~70% navy / near-black) ——
  bg: "#03060E",
  bgElevated: "#060B16",
  bgDeep: "#020611",
  surface: "#0B1526",
  surfaceCard: "#101E34",
  surfaceCardHover: "#162648",

  text: "#F5F7FA",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  border: "rgba(45, 62, 95, 0.40)",
  /** Solid-ish stroke for legacy components expecting hex-like contrast */
  borderSolid: "#273552",
  divider: "rgba(46, 64, 94, 0.32)",
  scrim: "rgba(0, 0, 0, 0.4)",

  surfaceIconMuted: "rgba(14, 22, 40, 0.78)",

  // —— Teal-green — agency highlight (~20%) ——
  accent: "#22B07D",
  accentDim: "#1A8F68",
  accentSoft: "#34D399",
  accentGlow: "rgba(34, 176, 125, 0.20)",
  accentBorder: "rgba(34, 176, 125, 0.26)",
  accentSubtle: "rgba(34, 176, 125, 0.09)",
  borderStrong: "rgba(34, 176, 125, 0.20)",
  overlayPattern: "rgba(38, 64, 118, 0.08)",
  heroGlowMid: "rgba(34, 176, 125, 0.06)",

  // —— Urgency / alert (supporting ~5–10%) ——
  alertAccent: "#C2412C",
  alertMuted: "rgba(194, 65, 48, 0.44)",
  crimsonHint: "rgba(176, 48, 40, 0.38)",
  amber: "#D4654A",
  amberMuted: "rgba(212, 101, 74, 0.48)",
  mint: "#22B07D",
  mintMuted: "rgba(34, 176, 125, 0.36)",

  // —— Operational semantics ——
  greenResolved: "#4ADE80",
  greenResolvedMuted: "rgba(74, 222, 128, 0.45)",
  cyan: "#5EB8E0",
  cyanMuted: "rgba(94, 184, 224, 0.45)",

  presenceLiveBg: "rgba(34, 176, 125, 0.11)",
  presenceLiveBorder: "rgba(34, 176, 125, 0.30)",
  presenceMutedBg: "rgba(52, 62, 82, 0.28)",
  presenceMutedBorder: "rgba(72, 88, 112, 0.38)",

  emptyPulseBorder: "rgba(34, 176, 125, 0.28)",
  emptyPulseFill: "rgba(34, 176, 125, 0.045)",

  statCardGradientBottom: statCardBottomDark,
  statCardActiveTop: "rgba(212, 101, 74, 0.11)",
  statCardResolvedTop: "rgba(74, 222, 128, 0.075)",
  statCardOnlineTop: "rgba(94, 184, 224, 0.075)",
  statCardNeutralTop: "rgba(255, 255, 255, 0.032)",

  navBorder: "rgba(34, 176, 125, 0.24)",
  navActiveBg: "rgba(34, 176, 125, 0.14)",
  navGlassOverlay: "rgba(3, 7, 16, 0.94)",

  // —— Workflow & status (shared with legacy `colors`) ——
  pending: "#D4654A",
  enroute: "#3B82F6",
  onScene: "#6366F1",
  done: "#15803D",
  resolved: "#15803D",
  active: "#3B82F6",
  info: "#3B82F6",
  success: "#22C55E",
  warning: "#CA8A04",
  critical: "#C41E3A",
  error: "#C41E3A",
  disabled: "#525E70",
  white: "#FFFFFF",

  priorityCritical: "#C41E3A",
  priorityHigh: "#D4654A",
  priorityMedium: "#22B07D",
  priorityLow: "#15803D",

  // —— Buttons ——
  buttonPrimaryBg: "#22B07D",
  buttonPrimaryText: "#0A0E18",
  buttonSecondaryBg: "transparent",
  buttonSecondaryBorder: "rgba(34, 176, 125, 0.55)",
  buttonSecondaryText: "#22B07D",
  buttonOutlinedBorder: "rgba(34, 176, 125, 0.35)",
  buttonDestructiveBg: "rgba(194, 74, 50, 0.12)",
  buttonDestructiveBorder: "rgba(212, 101, 74, 0.45)",
  buttonDestructiveText: "#F87171",
  buttonWarningBg: "rgba(202, 138, 4, 0.15)",
  buttonWarningText: "#EAB308",

  // —— Inputs / chrome ——
  inputBg: "#0B1526",
  inputBorder: "rgba(48, 66, 98, 0.45)",
  inputPlaceholder: "#64748B",

  switchTrackOff: "rgba(100, 116, 139, 0.35)",
  switchTrackOn: "rgba(34, 176, 125, 0.45)",
  switchThumbOff: "#94A3B8",
  switchThumbOn: "#22B07D",

  chipBg: "rgba(34, 176, 125, 0.10)",
  chipBorder: "rgba(34, 176, 125, 0.22)",

  // —— Login screen (navy + teal-green, unified brand) ——
  loginBgTop: "#020611",
  loginBgMid: "#03060E",
  loginBgBottom: "#0A1424",
  loginDecorFill: "rgba(34, 176, 125, 0.07)",
  loginDecorLine: "rgba(34, 176, 125, 0.06)",
  loginSurfaceCard: "#101E34",
  loginBorder: "rgba(34, 176, 125, 0.14)",
  loginBorderStrong: "rgba(34, 176, 125, 0.24)",
  loginCardShineTop: "rgba(34, 176, 125, 0.08)",
  loginCtaStart: "#1A8F68",
  loginCtaEnd: "#22B07D",
  loginCtaDisabledStart: "#2A303E",
  loginCtaDisabledEnd: "#1F2533",
  loginTextPrimary: "#F5F7FA",
  loginTextSubtitle: "#94A3B8",
  loginTextMuted: "#64748B",
  loginLink: "#34D399",
  loginIconTint: "#22B07D",

  // —— Map UI chrome ——
  mapOverlayScrim: "rgba(6, 10, 20, 0.88)",
  mapLineRouteAlt: "rgba(34, 176, 125, 0.35)",
  mapPinResolved: "#6B9080",
  mapFabIconOnAccent: "#060A14",

  // —— Alerts / sheets ——
  alertErrorBg: "#C41E3A",
  alertErrorText: "#FFFFFF",
  alertSoftBg: "rgba(194, 74, 50, 0.12)",
  alertSoftBorder: "rgba(194, 74, 50, 0.35)",
  alertSoftText: "#E8D5D0",
  sheetOverlay: "rgba(0, 0, 0, 0.45)",
};

/** Light — cool off-white bases, navy typography, teal-green highlights (not generic gray SaaS). */
export const lightResqTokens = {
  bg: "#E8EEF7",
  bgElevated: "#F0F5FC",
  bgDeep: "#DFE7F4",
  surface: "#FFFFFF",
  surfaceCard: "#FFFFFF",
  surfaceCardHover: "#F4F7FC",

  text: "#0B1220",
  textSecondary: "#475569",
  textMuted: "#64748B",

  border: "rgba(15, 23, 42, 0.10)",
  borderSolid: "#C8D0E0",
  divider: "rgba(15, 23, 42, 0.08)",
  scrim: "rgba(15, 23, 42, 0.35)",

  surfaceIconMuted: "rgba(241, 245, 251, 0.95)",

  accent: "#14B8A6",
  accentDim: "#0F766E",
  accentSoft: "#2DD4BF",
  accentGlow: "rgba(20, 184, 166, 0.18)",
  accentBorder: "rgba(20, 184, 166, 0.30)",
  accentSubtle: "rgba(20, 184, 166, 0.08)",
  borderStrong: "rgba(19, 42, 74, 0.12)",
  overlayPattern: "rgba(30, 58, 95, 0.06)",
  heroGlowMid: "rgba(20, 184, 166, 0.04)",

  alertAccent: "#B83C28",
  alertMuted: "rgba(184, 60, 40, 0.35)",
  crimsonHint: "rgba(176, 58, 48, 0.32)",
  amber: "#C2410C",
  amberMuted: "rgba(194, 65, 12, 0.45)",
  mint: "#14B8A6",
  mintMuted: "rgba(20, 184, 166, 0.40)",

  greenResolved: "#15803D",
  greenResolvedMuted: "rgba(21, 128, 61, 0.35)",
  cyan: "#0369A1",
  cyanMuted: "rgba(3, 105, 161, 0.35)",

  presenceLiveBg: "rgba(20, 184, 166, 0.10)",
  presenceLiveBorder: "rgba(20, 184, 166, 0.28)",
  presenceMutedBg: "rgba(241, 245, 251, 0.95)",
  presenceMutedBorder: "rgba(15, 23, 42, 0.12)",

  emptyPulseBorder: "rgba(20, 184, 166, 0.35)",
  emptyPulseFill: "rgba(20, 184, 166, 0.04)",

  statCardGradientBottom: statCardBottomLight,
  statCardActiveTop: "rgba(194, 65, 12, 0.06)",
  statCardResolvedTop: "rgba(21, 128, 61, 0.06)",
  statCardOnlineTop: "rgba(3, 105, 161, 0.06)",
  statCardNeutralTop: "rgba(15, 23, 42, 0.03)",

  navBorder: "rgba(20, 184, 166, 0.22)",
  navActiveBg: "rgba(20, 184, 166, 0.14)",
  navGlassOverlay: "rgba(255, 255, 255, 0.92)",

  pending: "#C2410C",
  enroute: "#2563EB",
  onScene: "#4F46E5",
  done: "#15803D",
  resolved: "#15803D",
  active: "#2563EB",
  info: "#2563EB",
  success: "#15803D",
  warning: "#B45309",
  critical: "#B91C1C",
  error: "#B91C1C",
  disabled: "#94A3B8",
  white: "#FFFFFF",

  priorityCritical: "#B91C1C",
  priorityHigh: "#C2410C",
  priorityMedium: "#14B8A6",
  priorityLow: "#15803D",

  // Primary CTA = navy (authority), teal-green = identity chrome
  buttonPrimaryBg: "#132A4A",
  buttonPrimaryText: "#F8FAFC",
  buttonSecondaryBg: "transparent",
  buttonSecondaryBorder: "rgba(20, 184, 166, 0.45)",
  buttonSecondaryText: "#132A4A",
  buttonOutlinedBorder: "rgba(19, 42, 74, 0.22)",
  buttonDestructiveBg: "rgba(185, 28, 28, 0.08)",
  buttonDestructiveBorder: "rgba(185, 28, 28, 0.35)",
  buttonDestructiveText: "#B91C1C",
  buttonWarningBg: "rgba(180, 83, 9, 0.12)",
  buttonWarningText: "#B45309",

  inputBg: "#F8FAFC",
  inputBorder: "rgba(15, 23, 42, 0.12)",
  inputPlaceholder: "#94A3B8",

  switchTrackOff: "rgba(148, 163, 184, 0.35)",
  switchTrackOn: "rgba(20, 184, 166, 0.40)",
  switchThumbOff: "#F1F5F9",
  switchThumbOn: "#14B8A6",

  chipBg: "rgba(20, 184, 166, 0.10)",
  chipBorder: "rgba(20, 184, 166, 0.24)",

  loginBgTop: "#F7FAFF",
  loginBgMid: "#EDF2F9",
  loginBgBottom: "#E4EBF6",
  loginDecorFill: "rgba(19, 42, 74, 0.06)",
  loginDecorLine: "rgba(19, 42, 74, 0.05)",
  loginSurfaceCard: "#FFFFFF",
  loginBorder: "rgba(15, 23, 42, 0.10)",
  loginBorderStrong: "rgba(19, 42, 74, 0.14)",
  loginCardShineTop: "rgba(20, 184, 166, 0.06)",
  loginCtaStart: "#142A47",
  loginCtaEnd: "#1E3F6B",
  loginCtaDisabledStart: "#CBD5E1",
  loginCtaDisabledEnd: "#B8C4D4",
  loginTextPrimary: "#0B1220",
  loginTextSubtitle: "#475569",
  loginTextMuted: "#64748B",
  loginLink: "#0F766E",
  loginIconTint: "#14B8A6",

  mapOverlayScrim: "rgba(248, 250, 252, 0.92)",
  mapLineRouteAlt: "rgba(20, 184, 166, 0.32)",
  mapPinResolved: "#4D7C59",
  mapFabIconOnAccent: "#F8FAFC",

  alertErrorBg: "#B91C1C",
  alertErrorText: "#FFFFFF",
  alertSoftBg: "rgba(185, 28, 28, 0.08)",
  alertSoftBorder: "rgba(185, 28, 28, 0.28)",
  alertSoftText: "#7F1D1D",
  sheetOverlay: "rgba(15, 23, 42, 0.4)",
};
