import React from "react";
import { View, Text } from "react-native";

export default function CaseStatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return { color: "#FF9500", bg: "#FFF4E6", text: "Pending" };
      case "enroute":
        return { color: "#007AFF", bg: "#E6F2FF", text: "En Route" };
      case "on_scene":
        return { color: "#5856D6", bg: "#E5E5FA", text: "On Scene" };
      case "done":
        return { color: "#34C759", bg: "#E6F7ED", text: "Done" };
      // Legacy statuses for backward compatibility
      case "active":
        return { color: "#007AFF", bg: "#E6F2FF", text: "Active" };
      case "resolved":
        return { color: "#34C759", bg: "#E6F7ED", text: "Resolved" };
      default:
        return { color: "#8E8E93", bg: "#F2F2F7", text: "Unknown" };
    }
  };

  const config = getStatusConfig();

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

