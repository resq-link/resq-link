import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBaseColors } from "./colors";
import {
  createAuthTheme,
  createCallingTheme,
  createDashboardTheme,
  createHistoryTheme,
  createNavTheme,
  createReportTheme,
  createMapTheme,
} from "./factories";

const APP_THEME_KEY = "app_theme";

export const AppThemeContext = createContext(null);

export function AppThemeProvider({ children }) {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(APP_THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error("Error loading app theme:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  const activeTheme = useMemo(() => {
    if (themeMode === "system") {
      return systemTheme === "light" ? "light" : "dark";
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  const isLight = activeTheme === "light";

  const colors = useMemo(() => createBaseColors(isLight), [isLight]);

  const reportTheme = useMemo(
    () => createReportTheme(isLight, colors),
    [isLight, colors]
  );
  const historyTheme = useMemo(
    () => createHistoryTheme(isLight, colors),
    [isLight, colors]
  );
  const authTheme = useMemo(() => createAuthTheme(isLight, colors), [isLight, colors]);
  const dashboardTheme = useMemo(
    () => createDashboardTheme(isLight, colors),
    [isLight, colors]
  );
  const navTheme = useMemo(() => createNavTheme(isLight, colors), [isLight, colors]);
  const callingTheme = useMemo(
    () => createCallingTheme(isLight, colors),
    [isLight, colors]
  );
  const mapTheme = useMemo(
    () => createMapTheme(isLight, colors),
    [isLight, colors]
  );

  const setThemePreference = useCallback(async (mode) => {
    if (!["light", "dark", "system"].includes(mode)) {
      return false;
    }
    try {
      await AsyncStorage.setItem(APP_THEME_KEY, mode);
      setThemeMode(mode);
      return true;
    } catch (error) {
      console.error("Error saving app theme:", error);
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      activeTheme,
      isLight,
      isLoaded,
      colors,
      reportTheme,
      historyTheme,
      authTheme,
      dashboardTheme,
      navTheme,
      callingTheme,
      mapTheme,
      setThemePreference,
      reloadThemePreference: loadThemePreference,
    }),
    [
      themeMode,
      activeTheme,
      isLight,
      isLoaded,
      colors,
      reportTheme,
      historyTheme,
      authTheme,
      dashboardTheme,
      navTheme,
      callingTheme,
      mapTheme,
      setThemePreference,
      loadThemePreference,
    ]
  );

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}
