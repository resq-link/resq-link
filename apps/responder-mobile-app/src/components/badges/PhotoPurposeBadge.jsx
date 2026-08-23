import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { radii, spacing } from "@/theme";

const PURPOSES = {
  civilian: {
    label: "CIVILIAN REPORT",
    hint: "Submitted during emergency reporting",
  },
  onScene: {
    label: "ON-SCENE EVIDENCE",
    hint: "Conditions observed upon arrival",
  },
  action: {
    label: "ACTION EVIDENCE",
    hint: "Responder actions or completed operations",
  },
};

export default function PhotoPurposeBadge({ purpose = "civilian", colors }) {
  const config = PURPOSES[purpose] || PURPOSES.civilian;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.accentSubtle ?? colors.chipBg,
            borderColor: colors.accentBorder ?? colors.chipBorder,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.accent }]}>{config.label}</Text>
      </View>
      {config.hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{config.hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
