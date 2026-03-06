import React from "react";
import { View, Text } from "react-native";

export default function CaseStatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return { color: "#FF9500", bg: "#1e293b", text: "Pending" };
      case "enroute":
        return { color: "#10b981", bg: "#1e293b", text: "En Route" };
      case "on_scene":
        return { color: "#818cf8", bg: "#1e293b", text: "On Scene" };
      case "done":
        return { color: "#34C759", bg: "#1e293b", text: "Done" };
      // Legacy statuses for backward compatibility
      case "active":
        return { color: "#10b981", bg: "#1e293b", text: "Active" };
      case "resolved":
        return { color: "#34C759", bg: "#1e293b", text: "Resolved" };
      default:
        return { color: "#94a3b8", bg: "#1e293b", text: "Unknown" };
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

