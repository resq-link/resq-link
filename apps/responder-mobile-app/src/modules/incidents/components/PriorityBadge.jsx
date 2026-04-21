import React from "react";
import { View, Text } from "react-native";
import { useResqTheme } from "@/theme";

export default function PriorityBadge({ priority }) {
  const { colors } = useResqTheme();

  const getPriorityConfig = () => {
    switch (priority) {
      case "critical":
        return { color: colors.priorityCritical, text: "Critical" };
      case "high":
        return { color: colors.priorityHigh, text: "High" };
      case "medium":
        return { color: colors.priorityMedium, text: "Medium" };
      case "low":
        return { color: colors.priorityLow, text: "Low" };
      default:
        return { color: colors.priorityMedium, text: "Medium" };
    }
  };

  const config = getPriorityConfig();

  return (
    <View
      style={{
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: config.color + "40",
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
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
