import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Compact section label with optional leading icon. */
export default function DashboardSectionLabel({ Icon, label, color, theme, style }) {
  return (
    <View style={[styles.row, style]}>
      {Icon ? (
        <Icon size={12} color={color ?? theme?.accent ?? "#2563EB"} strokeWidth={2.2} />
      ) : null}
      <Text style={[styles.label, { color: theme?.textMuted ?? "#64748B" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
