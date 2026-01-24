import React from "react";
import { View, Text } from "react-native";

export default function PriorityBadge({ priority }) {
  const getPriorityConfig = () => {
    switch (priority) {
      case "critical":
        return { color: "#ef4444", bg: "#1e293b", text: "Critical" };
      case "high":
        return { color: "#FF9500", bg: "#1e293b", text: "High" };
      case "medium":
        return { color: "#fbbf24", bg: "#1e293b", text: "Medium" };
      case "low":
        return { color: "#34C759", bg: "#1e293b", text: "Low" };
      default:
        return { color: "#94a3b8", bg: "#1e293b", text: "Medium" };
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
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 12,
          color: config.color,
        }}
      >
        {config.text}
      </Text>
    </View>
  );
}

