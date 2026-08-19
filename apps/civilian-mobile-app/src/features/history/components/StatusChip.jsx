import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getStatusPresentation } from "@/features/history/constants";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";

function StatusChip({ status, size = "sm" }) {
  const { historyTheme, isLight } = useAppTheme();
  const presentation = getStatusPresentation(status, historyTheme, isLight);
  const compact = size === "sm";

  return (
    <View
      style={[
        styles.chip,
        compact ? styles.chipSm : styles.chipMd,
        {
          backgroundColor: presentation.muted,
          borderColor: presentation.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status ${presentation.label}`}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: presentation.color,
            width: compact ? 6 : 7,
            height: compact ? 6 : 7,
            borderRadius: compact ? 3 : 3.5,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          compact ? styles.labelSm : styles.labelMd,
          { color: presentation.color },
        ]}
      >
        {presentation.label}
      </Text>
    </View>
  );
}

export default memo(StatusChip);

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipSm: {
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipMd: {
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  dot: {},
  label: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: historyTypography.badge,
  },
  labelMd: {
    fontSize: historyTypography.badge + 1,
  },
});
