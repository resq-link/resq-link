import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { radii, useResqTheme } from "@/theme";

export default function ErrorAlert({
  message,
  onDismiss,
  variant = "default",
  softBorderColor,
  softTextColor,
}) {
  const { colors, t } = useResqTheme();

  if (!message) return null;

  const isSoft = variant === "soft";

  return (
    <View
      style={{
        backgroundColor: isSoft ? "rgba(201, 125, 110, 0.12)" : colors.critical,
        borderRadius: radii.lg,
        padding: 14,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: isSoft
          ? softBorderColor ?? "rgba(201, 125, 110, 0.35)"
          : "rgba(255,255,255,0.15)",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 14,
          lineHeight: 20,
          color: isSoft ? softTextColor ?? "#E8D5D0" : colors.white,
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
              color: isSoft ? softTextColor ?? t.alertSoftText : t.alertErrorText,
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
