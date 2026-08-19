/** Unified semantic color tokens for Light and Dark modes. */

export function createBaseColors(isLight) {
  return {
    background: isLight ? "#F5F5F7" : "#0D0F12",
    headerBackground: isLight ? "#F5F5F7" : "#0D0F12",
    surface: isLight ? "#FFFFFF" : "#171A1F",
    card: isLight ? "#FFFFFF" : "#1F242B",
    cardAlt: isLight ? "#FFFFFF" : "#252525",
    cardInner: isLight ? "#F2F2F7" : "#2A2A2A",
    cardSubtle: isLight ? "#F2F2F7" : "#171A1F",
    cardGlass: isLight
      ? "rgba(255, 255, 255, 0.82)"
      : "rgba(31, 36, 43, 0.72)",
    border: isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)",
    borderAlt: isLight ? "#E5E5EA" : "#404040",
    borderFocus: isLight
      ? "rgba(52, 199, 89, 0.55)"
      : "rgba(124, 255, 77, 0.55)",
    separator: isLight ? "#ECECEF" : "rgba(255, 255, 255, 0.06)",
    divider: isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
    text: isLight ? "#111111" : "#FFFFFF",
    textSecondary: isLight ? "#66666E" : "#A5ADB8",
    textMuted: isLight ? "#8E8E93" : "#6B7280",
    mutedIcon: isLight ? "#8E8E93" : "#5A5A5A",
    placeholder: isLight ? "#8E8E93" : "rgba(184, 192, 204, 0.55)",
    onPrimary: isLight ? "#FFFFFF" : "#0D0F12",
    onEmergency: "#FFFFFF",
    primary: isLight ? "#34C759" : "#7CFF4D",
    primaryMuted: isLight
      ? "rgba(52, 199, 89, 0.12)"
      : "rgba(124, 255, 77, 0.14)",
    primarySoft: isLight
      ? "rgba(52, 199, 89, 0.12)"
      : "rgba(124, 255, 77, 0.14)",
    secondaryGreen: isLight ? "#248A3D" : "#34C759",
    emergency: "#FF3B30",
    emergencyMuted: isLight
      ? "rgba(255, 59, 48, 0.1)"
      : "rgba(255, 59, 48, 0.14)",
    emergencySoft: isLight
      ? "rgba(255, 59, 48, 0.08)"
      : "rgba(255, 59, 48, 0.12)",
    error: isLight ? "#FF3B30" : "#FF453A",
    errorBg: isLight
      ? "rgba(255, 59, 48, 0.1)"
      : "rgba(255, 69, 58, 0.12)",
    errorBorder: isLight
      ? "rgba(255, 59, 48, 0.35)"
      : "rgba(255, 69, 58, 0.35)",
    errorText: isLight ? "#C41E14" : "#FFD4D0",
    success: "#34C759",
    successMuted: isLight
      ? "rgba(52, 199, 89, 0.12)"
      : "rgba(52, 199, 89, 0.12)",
    warning: "#FF9F0A",
    warningMuted: isLight
      ? "rgba(255, 159, 10, 0.12)"
      : "rgba(255, 159, 10, 0.12)",
    pending: "#3B82F6",
    pendingMuted: isLight
      ? "rgba(59, 130, 246, 0.12)"
      : "rgba(59, 130, 246, 0.12)",
    accentBlue: "#2E72FF",
    accentBlueSoft: isLight
      ? "rgba(46, 114, 255, 0.1)"
      : "rgba(46, 114, 255, 0.14)",
    accentPurple: "#5856D6",
    accentPurpleSoft: isLight
      ? "rgba(88, 86, 214, 0.1)"
      : "rgba(88, 86, 214, 0.14)",
    mutedSurface: isLight
      ? "rgba(142, 142, 147, 0.12)"
      : "rgba(142, 142, 147, 0.12)",
    shadow: isLight ? "rgba(0, 0, 0, 0.06)" : "#000000",
    glowGreen: isLight
      ? "rgba(52, 199, 89, 0.14)"
      : "rgba(124, 255, 77, 0.14)",
    glowGreenSoft: isLight
      ? "rgba(52, 199, 89, 0.08)"
      : "rgba(52, 199, 89, 0.08)",
    orbPrimary: isLight
      ? "rgba(52, 199, 89, 0.08)"
      : "rgba(124, 255, 77, 0.12)",
    orbSecondary: isLight
      ? "rgba(52, 199, 89, 0.05)"
      : "rgba(52, 199, 89, 0.07)",
    orbAccent: isLight
      ? "rgba(52, 199, 89, 0.04)"
      : "rgba(124, 255, 77, 0.05)",
    ctaStart: isLight ? "#34C759" : "#34C759",
    ctaEnd: isLight ? "#30B350" : "#7CFF4D",
    ctaDisabledStart: isLight ? "#C8E6D0" : "#1A2E1F",
    ctaDisabledEnd: isLight ? "#B8DCC4" : "#152218",
    ctaText: isLight ? "#FFFFFF" : "#0D0F12",
    ctaTextDisabled: isLight
      ? "rgba(17, 17, 17, 0.35)"
      : "rgba(184, 192, 204, 0.45)",
    inputBg: isLight ? "#FFFFFF" : "transparent",
    inputBorder: isLight ? "#D1D1D6" : "#6C6C6C",
    inputBorderFocus: isLight ? "#34C759" : "#7CFF4D",
    buttonPrimaryBg: isLight ? "#111111" : "#FFFFFF",
    buttonPrimaryText: isLight ? "#FFFFFF" : "#000000",
    buttonSecondaryBg: isLight ? "#F2F2F7" : "#000000",
    buttonSecondaryText: isLight ? "#111111" : "#FFFFFF",
    buttonDisabledBg: isLight ? "#C7C7CC" : "#5A5A5A",
    backButtonBg: isLight ? "#F2F2F7" : "#252525",
    backButtonBorder: isLight ? "#E5E5EA" : "#404040",
    controlSurface: isLight ? "#F2F2F7" : "#1D1D1D",
    controlBorder: isLight ? "#D1D1D6" : "#333333",
    controlIcon: isLight ? "#111111" : "#F5F5F5",
    statusBarStyle: isLight ? "dark" : "light",
    navTint: isLight ? "light" : "dark",
    blurTint: isLight ? "light" : "dark",
    refreshTint: isLight ? "#34C759" : "#7CFF4D",
    link: isLight ? "#34C759" : "#7CFF4D",
    info: isLight ? "#007AFF" : "#0A84FF",
  };
}
