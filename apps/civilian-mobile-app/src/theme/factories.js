import { StyleSheet } from "react-native";
import { createBaseColors } from "./colors";

/** Report Emergency flow theme */
export function createReportTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    primary: colors.primary,
    primaryMuted: colors.primaryMuted,
    emergency: colors.emergency,
    emergencyMuted: colors.emergencyMuted,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    shadow: colors.shadow,
    errorText: colors.errorText,
  };
}

/** History screen theme */
export function createHistoryTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    cardSubtle: colors.cardSubtle,
    primary: colors.primary,
    primaryMuted: colors.primaryMuted,
    emergency: colors.emergency,
    emergencyMuted: colors.emergencyMuted,
    success: colors.success,
    successMuted: colors.successMuted,
    warning: colors.warning,
    warningMuted: colors.warningMuted,
    pending: colors.pending,
    pendingMuted: colors.pendingMuted,
    muted: colors.textMuted,
    mutedSurface: colors.mutedSurface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    border: colors.border,
    borderHairline: colors.border,
    shadow: colors.shadow,
    divider: colors.divider,
    info: colors.accentBlue,
    infoMuted: colors.accentBlueSoft,
    danger: colors.error,
    dangerMuted: colors.errorBg,
    orange: isLight ? "#EA580C" : "#FB923C",
    orangeMuted: isLight ? "rgba(234, 88, 12, 0.12)" : "rgba(251, 146, 60, 0.14)",
  };
}

export function createHistoryCardShell(theme, { featured = false } = {}) {
  return {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: featured ? 1.5 : 1,
    borderColor: featured ? theme.emergency : theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: featured ? 4 : 3 },
    shadowOpacity: featured ? 0.16 : 0.1,
    shadowRadius: featured ? 14 : 10,
    elevation: featured ? 4 : 3,
    overflow: "hidden",
  };
}

/** @deprecated Use createHistoryCardShell — archived cards stay fully visible now. */
export function createHistoryCardShellSubtle(theme) {
  return createHistoryCardShell(theme);
}

/** Auth screens (login, register, splash) */
export function createAuthTheme(isLight, colors = createBaseColors(isLight)) {
  const login = isLight
    ? {
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
      loginAccent: "#14B8A6",
      loginAlertSoftBg: "rgba(201, 125, 110, 0.12)",
      loginAlertSoftBorder: "rgba(201, 125, 110, 0.35)",
      loginAlertSoftText: "#7C4A42",
      loginCtaText: "#FFFFFF",
    }
    : {
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
      loginAccent: "#22B07D",
      loginAlertSoftBg: "rgba(201, 125, 110, 0.12)",
      loginAlertSoftBorder: "rgba(201, 125, 110, 0.35)",
      loginAlertSoftText: "#E8D5D0",
      loginCtaText: "#FFFFFF",
    };

  return {
    primaryGreen: colors.primary,
    secondaryGreen: colors.secondaryGreen,
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    cardGlass: colors.cardGlass,
    primaryText: colors.text,
    secondaryText: colors.textSecondary,
    mutedText: colors.placeholder,
    border: colors.border,
    borderFocus: colors.borderFocus,
    error: colors.error,
    errorBg: colors.errorBg,
    errorBorder: colors.errorBorder,
    errorText: colors.errorText,
    ctaStart: colors.ctaStart,
    ctaEnd: colors.ctaEnd,
    ctaDisabledStart: colors.ctaDisabledStart,
    ctaDisabledEnd: colors.ctaDisabledEnd,
    ctaText: colors.ctaText,
    ctaTextDisabled: colors.ctaTextDisabled,
    glowGreen: colors.glowGreen,
    glowGreenSoft: colors.glowGreenSoft,
    orbPrimary: colors.orbPrimary,
    orbSecondary: colors.orbSecondary,
    orbAccent: colors.orbAccent,
    inputBg: colors.inputBg,
    inputBorder: colors.inputBorder,
    inputBorderFocus: colors.inputBorderFocus,
    link: colors.link,
    blurTint: colors.blurTint,
    gradientMid: isLight ? "#E8E8ED" : "#111419",
    surfaceFocused: isLight ? "rgba(255,255,255,0.98)" : "rgba(23,26,31,0.95)",
    forgotBtnBg: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
    backButtonBg: colors.backButtonBg,
    backButtonBorder: colors.backButtonBorder,
    buttonPrimaryBg: colors.buttonPrimaryBg,
    buttonPrimaryText: colors.buttonPrimaryText,
    buttonSecondaryBg: colors.buttonSecondaryBg,
    buttonSecondaryText: colors.buttonSecondaryText,
    buttonDisabledBg: colors.buttonDisabledBg,
    ...login,
  };
}

/** Dashboard screen theme */
export function createDashboardTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    border: colors.border,
    shadow: colors.shadow,
    text: colors.text,
    textSecondary: colors.textSecondary,
    mutedText: colors.placeholder,
    mutedIcon: colors.mutedIcon,
    primaryGreen: colors.primary,
    primaryGreenSoft: colors.primarySoft,
    emergency: colors.emergency,
    emergencySoft: colors.emergencyMuted,
    emergencyMuted: colors.emergencySoft,
    warning: colors.warning,
    warningSoft: colors.warningMuted,
    accentBlue: colors.accentBlue,
    accentBlueSoft: colors.accentBlueSoft,
    accentPurpleSoft: colors.accentPurpleSoft,
    accentPurple: colors.accentPurple,
    refreshTint: colors.refreshTint,
    onPrimary: colors.onPrimary,
    onEmergency: colors.onEmergency,
    emergencyGradientEnd: isLight ? "#FF5A52" : "#FF453A",
  };
}

/** Bottom navigation theme */
export function createNavTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    barBg: colors.surface,
    barBorder: colors.border,
    barShadow: colors.shadow,
    activePill: colors.primaryMuted,
    activeIcon: colors.primary,
    inactiveIcon: colors.textSecondary,
    activeLabel: colors.text,
    inactiveLabel: colors.textSecondary,
    actionBorder: isLight
      ? "rgba(255, 255, 255, 0.9)"
      : "rgba(255, 255, 255, 0.12)",
    sosBorder: isLight
      ? "rgba(255, 255, 255, 0.85)"
      : "rgba(255, 255, 255, 0.18)",
    callIcon: colors.onPrimary,
  };
}

/** Voice call screen theme */
export function createCallingTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    background: colors.background,
    primary: colors.primary,
    text: colors.text,
    textSecondary: colors.textSecondary,
    controlSurface: colors.controlSurface,
    controlBorder: colors.controlBorder,
    controlIcon: colors.controlIcon,
    emergency: colors.emergency,
    onPrimary: colors.onPrimary,
    ringColor: colors.primary,
  };
}

/** Live incident map screen theme */
export function createMapTheme(isLight, colors = createBaseColors(isLight)) {
  return {
    background: colors.background,
    card: colors.card,
    cardInner: colors.cardInner,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    primary: colors.primary,
    primarySoft: colors.primarySoft,
    barBg: colors.surface,
    barBtnBg: colors.card,
    shadow: colors.shadow,
    sheetBg: colors.surface,
    sheetHandle: isLight ? "#D1D1D6" : "#3A3F47",
    live: colors.emergency,
    liveSoft: isLight ? "rgba(255, 59, 48, 0.12)" : "rgba(255, 59, 48, 0.16)",
    badgeBg: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
    badgeText: colors.textSecondary,
    liveBadgeBg: isLight ? "rgba(255, 59, 48, 0.12)" : "rgba(255, 59, 48, 0.18)",
    liveBadgeText: isLight ? "#C41E16" : "#FF6B63",
  };
}
