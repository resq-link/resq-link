import React from "react";
import { View, Text } from "react-native";

export default function PriorityBadge({ priority }) {
  const getPriorityConfig = () => {
    switch (priority) {
      case "critical":
        return { color: "#FF3B30", bg: "#FFE6E6", text: "Critical" };
      case "high":
        return { color: "#FF9500", bg: "#FFF4E6", text: "High" };
      case "medium":
        return { color: "#FFCC00", bg: "#FFFBE6", text: "Medium" };
      case "low":
        return { color: "#34C759", bg: "#E6F7ED", text: "Low" };
      default:
        return { color: "#8E8E93", bg: "#F2F2F7", text: "Medium" };
    }
  };

  const config = getPriorityConfig();

  return (
    <View
      style={{
        backgroundColor: config.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: config.color,
        }}
      >
        {config.text}
      </Text>
    </View>
  );
}

