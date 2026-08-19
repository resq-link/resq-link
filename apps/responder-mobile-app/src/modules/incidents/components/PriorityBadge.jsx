import React from "react";
import { View, Text } from "react-native";
import { useResqTheme } from "@/theme";

export default function PriorityBadge({ priority }) {
  const { colors } = useResqTheme();

  const getPriorityConfig = () => {
    switch (priority) {
      case "critical":
        return { color: colors.priorityCritical, text: "Critical", mark: "●" };
      case "high":
        return { color: colors.priorityHigh, text: "High", mark: "●" };
      case "medium":
        return { color: colors.priorityMedium, text: "Medium", mark: "●" };
      case "low":
        return { color: colors.priorityLow, text: "Low", mark: "●" };
      default:
        return { color: colors.priorityMedium, text: "Medium", mark: "●" };
    }
  };

  const config = getPriorityConfig();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: colors.surfaceHighlight ?? colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: config.color + "40",
      }}
      accessibilityLabel={`Priority ${config.text}`}
    >
      <Text style={{ fontSize: 8, color: config.color, lineHeight: 12 }}>
        {config.mark}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          color: config.color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {config.text}
      </Text>
    </View>
  );
}
