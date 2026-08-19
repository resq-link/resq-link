/**
 * RES.Q Responder design tokens — Dark & Light.
 * Responder identity: Deep Emergency Blue primary, Bright Rescue Blue secondary,
 * Emergency Red only for critical/urgency. Complements civilian app without copying teal.
 * Use via `useResqTheme().t` — keys are identical across modes for predictable theming.
 */

const statCardBottomDark = "rgba(7, 11, 22, 0.96)";
const statCardBottomLight = "rgba(248, 250, 252, 0.97)";

/** Deep Emergency Blue — app bars, primary CTAs, authority chrome */
const DEEP_BLUE = "#0B1F3A";
const DEEP_BLUE_MID = "#132A4A";
const DEEP_BLUE_LIGHT = "#1E3A5F";

/** Bright Rescue Blue — highlights, active tabs, interactive chrome */
const RESCUE_BLUE = "#2563EB";
const RESCUE_BLUE_BRIGHT = "#3B82F6";
const RESCUE_BLUE_SOFT = "#60A5FA";

/** Emergency Red — critical / SOS only */
const EMERGENCY_RED = "#DC2626";
const EMERGENCY_RED_DARK = "#EF4444";

/** Success / Warning */
const SUCCESS_GREEN = "#16A34A";
const SUCCESS_GREEN_BRIGHT = "#22C55E";
const WARNING_AMBER = "#D97706";
const WARNING_AMBER_BRIGHT = "#F59E0B";
const ON_SCENE_ORANGE = "#EA580C";

/** Logged-in responder — dark: deep navy base, rescue-blue identity. */
export const darkResqTokens = {
  // —— Foundation (~70% deep navy) ——
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
  borderSolid: "#273552",
  divider: "rgba(46, 64, 94, 0.32)",
  scrim: "rgba(0, 0, 0, 0.4)",

  surfaceIconMuted: "rgba(14, 22, 40, 0.78)",

  // —— Bright Rescue Blue — secondary / interactive (~20%) ——
  accent: RESCUE_BLUE_BRIGHT,
  accentDim: RESCUE_BLUE,
  accentSoft: RESCUE_BLUE_SOFT,
  accentGlow: "rgba(59, 130, 246, 0.22)",
  accentBorder: "rgba(59, 130, 246, 0.30)",
  accentSubtle: "rgba(59, 130, 246, 0.10)",
  borderStrong: "rgba(59, 130, 246, 0.22)",
  overlayPattern: "rgba(30, 58, 95, 0.10)",
  heroGlowMid: "rgba(59, 130, 246, 0.07)",

  // —— Urgency / alert (supporting ~5–10%) ——
  alertAccent: EMERGENCY_RED,
  alertMuted: "rgba(220, 38, 38, 0.44)",
  crimsonHint: "rgba(220, 38, 38, 0.38)",
  amber: WARNING_AMBER_BRIGHT,
  amberMuted: "rgba(245, 158, 11, 0.48)",
  mint: RESCUE_BLUE_BRIGHT,
  mintMuted: "rgba(59, 130, 246, 0.36)",

  // —— Operational semantics ——
  greenResolved: SUCCESS_GREEN_BRIGHT,
  greenResolvedMuted: "rgba(34, 197, 94, 0.45)",
  cyan: RESCUE_BLUE_SOFT,
  cyanMuted: "rgba(96, 165, 250, 0.45)",

  presenceLiveBg: "rgba(59, 130, 246, 0.12)",
  presenceLiveBorder: "rgba(59, 130, 246, 0.32)",
  presenceMutedBg: "rgba(52, 62, 82, 0.28)",
  presenceMutedBorder: "rgba(72, 88, 112, 0.38)",

  emptyPulseBorder: "rgba(59, 130, 246, 0.30)",
  emptyPulseFill: "rgba(59, 130, 246, 0.05)",

  statCardGradientBottom: statCardBottomDark,
  statCardActiveTop: "rgba(245, 158, 11, 0.12)",
  statCardResolvedTop: "rgba(34, 197, 94, 0.08)",
  statCardOnlineTop: "rgba(59, 130, 246, 0.08)",
  statCardNeutralTop: "rgba(255, 255, 255, 0.032)",

  navBorder: "rgba(59, 130, 246, 0.28)",
  navActiveBg: "rgba(59, 130, 246, 0.16)",
  navGlassOverlay: "rgba(3, 7, 16, 0.94)",

  // —— Workflow & status ——
  pending: WARNING_AMBER_BRIGHT,
  enroute: RESCUE_BLUE_BRIGHT,
  onScene: ON_SCENE_ORANGE,
  done: SUCCESS_GREEN,
  resolved: SUCCESS_GREEN,
  active: RESCUE_BLUE_BRIGHT,
  info: RESCUE_BLUE_BRIGHT,
  success: SUCCESS_GREEN_BRIGHT,
  warning: WARNING_AMBER,
  critical: EMERGENCY_RED_DARK,
  error: EMERGENCY_RED_DARK,
  disabled: "#525E70",
  white: "#FFFFFF",

  priorityCritical: EMERGENCY_RED_DARK,
  priorityHigh: ON_SCENE_ORANGE,
  priorityMedium: WARNING_AMBER_BRIGHT,
  priorityLow: SUCCESS_GREEN_BRIGHT,

  // —— Buttons — Deep Emergency Blue primary ——
  buttonPrimaryBg: DEEP_BLUE_LIGHT,
  buttonPrimaryText: "#F8FAFC",
  buttonSecondaryBg: "transparent",
  buttonSecondaryBorder: "rgba(59, 130, 246, 0.55)",
  buttonSecondaryText: RESCUE_BLUE_SOFT,
  buttonOutlinedBorder: "rgba(59, 130, 246, 0.35)",
  buttonDestructiveBg: "rgba(220, 38, 38, 0.12)",
  buttonDestructiveBorder: "rgba(239, 68, 68, 0.45)",
  buttonDestructiveText: "#F87171",
  buttonWarningBg: "rgba(245, 158, 11, 0.15)",
  buttonWarningText: WARNING_AMBER_BRIGHT,

  // —— Inputs / chrome ——
  inputBg: "#0B1526",
  inputBorder: "rgba(48, 66, 98, 0.45)",
  inputPlaceholder: "#64748B",

  switchTrackOff: "rgba(100, 116, 139, 0.35)",
  switchTrackOn: "rgba(59, 130, 246, 0.45)",
  switchThumbOff: "#94A3B8",
  switchThumbOn: RESCUE_BLUE_BRIGHT,

  chipBg: "rgba(59, 130, 246, 0.10)",
  chipBorder: "rgba(59, 130, 246, 0.24)",

  // —— Login screen ——
  loginBgTop: "#020611",
  loginBgMid: "#03060E",
  loginBgBottom: "#0A1424",
  loginDecorFill: "rgba(59, 130, 246, 0.08)",
  loginDecorLine: "rgba(59, 130, 246, 0.07)",
  loginSurfaceCard: "#101E34",
  loginBorder: "rgba(59, 130, 246, 0.16)",
  loginBorderStrong: "rgba(59, 130, 246, 0.26)",
  loginCardShineTop: "rgba(59, 130, 246, 0.09)",
  loginCtaStart: DEEP_BLUE_MID,
  loginCtaEnd: DEEP_BLUE_LIGHT,
  loginCtaDisabledStart: "#2A303E",
  loginCtaDisabledEnd: "#1F2533",
  loginTextPrimary: "#F5F7FA",
  loginTextSubtitle: "#94A3B8",
  loginTextMuted: "#64748B",
  loginLink: RESCUE_BLUE_SOFT,
  loginIconTint: RESCUE_BLUE_BRIGHT,
  loginAccent: RESCUE_BLUE_BRIGHT,
  loginCtaText: "#FFFFFF",
  loginAlertSoftBg: "rgba(201, 125, 110, 0.12)",
  loginAlertSoftBorder: "rgba(201, 125, 110, 0.35)",
  loginAlertSoftText: "#E8D5D0",
  loginSecurityBg: "rgba(59, 130, 246, 0.08)",
  loginSecurityBorder: "rgba(59, 130, 246, 0.18)",
  loginBadgeBg: "rgba(59, 130, 246, 0.12)",
  loginBadgeBorder: "rgba(59, 130, 246, 0.28)",
  loginBadgeText: RESCUE_BLUE_SOFT,

  // —— Map UI chrome ——
  mapOverlayScrim: "rgba(6, 10, 20, 0.88)",
  mapLineRouteAlt: "rgba(59, 130, 246, 0.35)",
  mapPinResolved: "#6B9080",
  mapFabIconOnAccent: "#F8FAFC",

  // —— Alerts / sheets ——
  alertErrorBg: EMERGENCY_RED,
  alertErrorText: "#FFFFFF",
  alertSoftBg: "rgba(220, 38, 38, 0.12)",
  alertSoftBorder: "rgba(220, 38, 38, 0.35)",
  alertSoftText: "#E8D5D0",
  sheetOverlay: "rgba(0, 0, 0, 0.45)",
};

/** Light — cool neutrals, Deep Emergency Blue type/CTAs, Bright Rescue Blue chrome. */
export const lightResqTokens = {
  bg: "#EEF2F7",
  bgElevated: "#F5F7FA",
  bgDeep: "#E4EAF2",
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

  accent: RESCUE_BLUE,
  accentDim: "#1D4ED8",
  accentSoft: RESCUE_BLUE_BRIGHT,
  accentGlow: "rgba(37, 99, 235, 0.18)",
  accentBorder: "rgba(37, 99, 235, 0.30)",
  accentSubtle: "rgba(37, 99, 235, 0.08)",
  borderStrong: "rgba(11, 31, 58, 0.14)",
  overlayPattern: "rgba(11, 31, 58, 0.06)",
  heroGlowMid: "rgba(37, 99, 235, 0.05)",

  alertAccent: EMERGENCY_RED,
  alertMuted: "rgba(220, 38, 38, 0.35)",
  crimsonHint: "rgba(220, 38, 38, 0.32)",
  amber: WARNING_AMBER,
  amberMuted: "rgba(217, 119, 6, 0.45)",
  mint: RESCUE_BLUE,
  mintMuted: "rgba(37, 99, 235, 0.40)",

  greenResolved: SUCCESS_GREEN,
  greenResolvedMuted: "rgba(22, 163, 74, 0.35)",
  cyan: "#0369A1",
  cyanMuted: "rgba(3, 105, 161, 0.35)",

  presenceLiveBg: "rgba(37, 99, 235, 0.10)",
  presenceLiveBorder: "rgba(37, 99, 235, 0.28)",
  presenceMutedBg: "rgba(241, 245, 251, 0.95)",
  presenceMutedBorder: "rgba(15, 23, 42, 0.12)",

  emptyPulseBorder: "rgba(37, 99, 235, 0.35)",
  emptyPulseFill: "rgba(37, 99, 235, 0.04)",

  statCardGradientBottom: statCardBottomLight,
  statCardActiveTop: "rgba(217, 119, 6, 0.07)",
  statCardResolvedTop: "rgba(22, 163, 74, 0.06)",
  statCardOnlineTop: "rgba(37, 99, 235, 0.06)",
  statCardNeutralTop: "rgba(15, 23, 42, 0.03)",

  navBorder: "rgba(37, 99, 235, 0.24)",
  navActiveBg: "rgba(37, 99, 235, 0.12)",
  navGlassOverlay: "rgba(255, 255, 255, 0.92)",

  pending: WARNING_AMBER,
  enroute: RESCUE_BLUE,
  onScene: ON_SCENE_ORANGE,
  done: SUCCESS_GREEN,
  resolved: SUCCESS_GREEN,
  active: RESCUE_BLUE,
  info: RESCUE_BLUE,
  success: SUCCESS_GREEN,
  warning: WARNING_AMBER,
  critical: EMERGENCY_RED,
  error: EMERGENCY_RED,
  disabled: "#94A3B8",
  white: "#FFFFFF",

  priorityCritical: EMERGENCY_RED,
  priorityHigh: ON_SCENE_ORANGE,
  priorityMedium: WARNING_AMBER,
  priorityLow: SUCCESS_GREEN,

  buttonPrimaryBg: DEEP_BLUE,
  buttonPrimaryText: "#F8FAFC",
  buttonSecondaryBg: "transparent",
  buttonSecondaryBorder: "rgba(37, 99, 235, 0.45)",
  buttonSecondaryText: DEEP_BLUE,
  buttonOutlinedBorder: "rgba(11, 31, 58, 0.22)",
  buttonDestructiveBg: "rgba(220, 38, 38, 0.08)",
  buttonDestructiveBorder: "rgba(220, 38, 38, 0.35)",
  buttonDestructiveText: EMERGENCY_RED,
  buttonWarningBg: "rgba(217, 119, 6, 0.12)",
  buttonWarningText: WARNING_AMBER,

  inputBg: "#F8FAFC",
  inputBorder: "rgba(15, 23, 42, 0.12)",
  inputPlaceholder: "#94A3B8",

  switchTrackOff: "rgba(148, 163, 184, 0.35)",
  switchTrackOn: "rgba(37, 99, 235, 0.40)",
  switchThumbOff: "#F1F5F9",
  switchThumbOn: RESCUE_BLUE,

  chipBg: "rgba(37, 99, 235, 0.10)",
  chipBorder: "rgba(37, 99, 235, 0.24)",

  loginBgTop: "#F5F8FC",
  loginBgMid: "#EAF0F8",
  loginBgBottom: "#E0E8F3",
  loginDecorFill: "rgba(11, 31, 58, 0.06)",
  loginDecorLine: "rgba(11, 31, 58, 0.05)",
  loginSurfaceCard: "#FFFFFF",
  loginBorder: "rgba(15, 23, 42, 0.10)",
  loginBorderStrong: "rgba(11, 31, 58, 0.14)",
  loginCardShineTop: "rgba(37, 99, 235, 0.06)",
  loginCtaStart: DEEP_BLUE,
  loginCtaEnd: DEEP_BLUE_MID,
  loginCtaDisabledStart: "#CBD5E1",
  loginCtaDisabledEnd: "#B8C4D4",
  loginTextPrimary: "#0B1220",
  loginTextSubtitle: "#475569",
  loginTextMuted: "#64748B",
  loginLink: RESCUE_BLUE,
  loginIconTint: RESCUE_BLUE,
  loginAccent: RESCUE_BLUE,
  loginCtaText: "#FFFFFF",
  loginAlertSoftBg: "rgba(201, 125, 110, 0.12)",
  loginAlertSoftBorder: "rgba(201, 125, 110, 0.35)",
  loginAlertSoftText: "#7C4A42",
  loginSecurityBg: "rgba(11, 31, 58, 0.05)",
  loginSecurityBorder: "rgba(11, 31, 58, 0.10)",
  loginBadgeBg: "rgba(37, 99, 235, 0.08)",
  loginBadgeBorder: "rgba(37, 99, 235, 0.22)",
  loginBadgeText: DEEP_BLUE_MID,

  mapOverlayScrim: "rgba(248, 250, 252, 0.92)",
  mapLineRouteAlt: "rgba(37, 99, 235, 0.32)",
  mapPinResolved: "#4D7C59",
  mapFabIconOnAccent: "#F8FAFC",

  alertErrorBg: EMERGENCY_RED,
  alertErrorText: "#FFFFFF",
  alertSoftBg: "rgba(220, 38, 38, 0.08)",
  alertSoftBorder: "rgba(220, 38, 38, 0.28)",
  alertSoftText: "#7F1D1D",
  sheetOverlay: "rgba(15, 23, 42, 0.4)",
};
