import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkResqTokens, lightResqTokens } from "@/theme/tokens/resqTokens";

export const RESQ_APPEARANCE_KEY = "resq.appearance.preference";

/** @typedef {'light' | 'dark' | 'system'} AppearancePreference */

/**
 * Legacy CaseCard / workflow shape (formerly `colors` from `@/theme/colors`).
 * @param {typeof darkResqTokens} t
 */
export function buildSemanticColors(t) {
  return {
    background: t.bg,
    surface: t.surface,
    surfaceElevated: t.surfaceCard,
    surfaceHighlight: t.surfaceCardHover,
    border: t.borderSolid,
    text: t.text,
    textSecondary: t.textSecondary,
    textMuted: t.textMuted,
    accent: t.accent,
    accentDim: t.accentDim,
    critical: t.critical,
    success: t.success,
    warning: t.warning,
    info: t.info,
    error: t.error,
    pending: t.pending,
    enroute: t.enroute,
    onScene: t.onScene,
    done: t.done,
    disabled: t.disabled,
    white: t.white,
    priorityCritical: t.priorityCritical,
    priorityHigh: t.priorityHigh,
    priorityMedium: t.priorityMedium,
    priorityLow: t.priorityLow,
  };
}

const ResqThemeContext = createContext(null);

export function ResqThemeProvider({ children }) {
  const systemScheme = useColorScheme() ?? "dark";

  /** @type {[AppearancePreference, React.Dispatch<React.SetStateAction<AppearancePreference>>]} */
  const [appearance, setAppearanceState] = useState("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(RESQ_APPEARANCE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw === "light" || raw === "dark" || raw === "system") {
        setAppearanceState(raw);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearance = useCallback((next) => {
    setAppearanceState(next);
    AsyncStorage.setItem(RESQ_APPEARANCE_KEY, next).catch(() => {});
  }, []);

  const resolvedScheme = useMemo(() => {
    if (appearance === "system") return systemScheme === "light" ? "light" : "dark";
    return appearance;
  }, [appearance, systemScheme]);

  const t = resolvedScheme === "dark" ? darkResqTokens : lightResqTokens;

  const colors = useMemo(() => buildSemanticColors(t), [t]);

  /** Expo StatusBar `style` prop */
  const statusBarStyle = resolvedScheme === "dark" ? "light" : "dark";

  const value = useMemo(
    () => ({
      appearance,
      setAppearance,
      hydrated,
      resolvedScheme,
      systemScheme: systemScheme === "light" ? "light" : "dark",
      t,
      colors,
      statusBarStyle,
    }),
    [appearance, setAppearance, hydrated, resolvedScheme, systemScheme, t, colors, statusBarStyle]
  );

  return (
    <ResqThemeContext.Provider value={value}>{children}</ResqThemeContext.Provider>
  );
}

export function useResqTheme() {
  const ctx = useContext(ResqThemeContext);
  if (!ctx) {
    throw new Error("useResqTheme must be used within ResqThemeProvider");
  }
  return ctx;
}
