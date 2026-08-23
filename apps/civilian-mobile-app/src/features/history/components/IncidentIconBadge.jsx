import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/hooks/useAppTheme";

const SIZES = {
  sm: { box: 36, icon: 18, radius: 11, border: 1 },
  md: { box: 44, icon: 22, radius: 14, border: 1.2 },
  lg: { box: 52, icon: 26, radius: 16, border: 1.5 },
};

function IncidentIconBadge({ meta, size = "md", dimmed = false }) {
  const { historyTheme, isLight } = useAppTheme();
  const Icon = meta.Icon;
  const dims = SIZES[size] || SIZES.md;

  const gradientColors = dimmed
    ? isLight
      ? ["rgba(0,0,0,0.04)", "rgba(0,0,0,0.06)"]
      : ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)"]
    : isLight
      ? [meta.badgeBg || "rgba(239, 68, 68, 0.12)", "rgba(255, 255, 255, 0.95)"]
      : [meta.badgeBg || "rgba(239, 68, 68, 0.18)", "rgba(18, 24, 38, 0.9)"];

  const borderColor = dimmed
    ? historyTheme.border
    : meta.badgeBorder || "rgba(255,255,255,0.15)";

  const iconColor = dimmed
    ? historyTheme.textMuted
    : meta.iconColor || historyTheme.primary;

  return (
    <View
      style={[
        styles.outer,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          borderColor,
          borderWidth: dims.border,
          shadowColor: dimmed ? "transparent" : meta.iconColor || "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isLight ? 0.12 : 0.22,
          shadowRadius: 6,
          elevation: dimmed ? 0 : 2,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            borderRadius: dims.radius - dims.border,
          },
        ]}
      >
        <Icon size={dims.icon} color={iconColor} strokeWidth={2.3} />
      </LinearGradient>
    </View>
  );
}

export default memo(IncidentIconBadge);

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

