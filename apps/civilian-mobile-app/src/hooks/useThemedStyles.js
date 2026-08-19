import { useMemo } from "react";
import { StyleSheet } from "react-native";

/** Memoized StyleSheet factory keyed on theme object identity. */
export function useThemedStyles(factory, theme) {
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
