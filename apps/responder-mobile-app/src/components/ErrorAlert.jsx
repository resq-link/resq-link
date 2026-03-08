import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors, radii } from "@/theme";

export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: colors.critical,
        borderRadius: radii.md,
        padding: 16,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 14,
          color: colors.white,
        }}
      >
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            padding: 4,
            marginLeft: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 18,
              color: colors.white,
              opacity: 0.9,
            }}
          >
            ×
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
