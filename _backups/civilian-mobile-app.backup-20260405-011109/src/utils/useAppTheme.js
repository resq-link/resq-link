import { useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const APP_THEME_KEY = "app_theme";

export function useAppTheme() {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("dark");

  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(APP_THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error("Error loading app theme:", error);
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
    }, [loadThemePreference])
  );

  const activeTheme = useMemo(() => {
    if (themeMode === "system") {
      return systemTheme === "light" ? "light" : "dark";
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  const isLight = activeTheme === "light";

  const colors = useMemo(
    () => ({
      background: isLight ? "#F5F5F7" : "#000000",
      headerBackground: isLight ? "#F5F5F7" : "#000000",
      card: isLight ? "#FFFFFF" : "#252525",
      cardAlt: isLight ? "#FFFFFF" : "#1A1A1A",
      cardInner: isLight ? "#F2F2F7" : "#2A2A2A",
      border: isLight ? "#E5E5EA" : "#404040",
      borderAlt: isLight ? "#ECECEF" : "#2A2A2A",
      separator: isLight ? "#ECECEF" : "#404040",
      text: isLight ? "#111111" : "#FFFFFF",
      textSecondary: isLight ? "#66666E" : "#9A9A9A",
      mutedIcon: isLight ? "#8E8E93" : "#5A5A5A",
      statusBarStyle: isLight ? "dark" : "light",
      navTint: isLight ? "light" : "dark",
    }),
    [isLight]
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

  return {
    themeMode,
    activeTheme,
    isLight,
    colors,
    setThemePreference,
  };
}

