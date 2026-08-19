import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

const SIZES = {
  sm: { box: 36, icon: 18, radius: 10 },
  md: { box: 40, icon: 20, radius: 11 },
  lg: { box: 48, icon: 22, radius: 13 },
};

function IncidentIconBadge({ meta, size = "md", dimmed = false }) {
  const { historyTheme } = useAppTheme();
  const Icon = meta.Icon;
  const dims = SIZES[size] || SIZES.md;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          backgroundColor: dimmed ? historyTheme.mutedSurface : meta.iconBg,
        },
      ]}
    >
      <Icon
        size={dims.icon}
        color={dimmed ? historyTheme.textMuted : meta.iconColor}
        strokeWidth={2.2}
      />
    </View>
  );
}

export default memo(IncidentIconBadge);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
