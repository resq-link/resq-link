import React from "react";
import { View, Text } from "react-native";
import { useResqTheme } from "@/theme";

export default function CaseStatusBadge({ status }) {
  const { colors } = useResqTheme();

  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return { color: colors.pending, text: "Pending" };
      case "enroute":
        return { color: colors.enroute, text: "En Route" };
      case "on_scene":
        return { color: colors.onScene, text: "On Scene" };
      case "done":
        return { color: colors.done, text: "Done" };
      case "active":
        return { color: colors.enroute, text: "Active" };
      case "resolved":
        return { color: colors.done, text: "Resolved" };
      default:
        return { color: colors.textMuted, text: "Unknown" };
    }
  };

  const config = getStatusConfig();

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
