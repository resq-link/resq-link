import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useResqTheme } from "@/theme";

export default function ErrorAlert({
  message,
  onDismiss,
  variant = "default",
  softBorderColor,
  softTextColor,
  softBgColor,
  borderRadius = 14,
  bodyFontFamily = "Inter_400Regular",
  dismissFontFamily = "Inter_600SemiBold",
}) {
  const { colors, t } = useResqTheme();

  if (!message) return null;

  const isSoft = variant === "soft";

  return (
    <View
      style={{
        backgroundColor: isSoft
          ? softBgColor ?? t.loginAlertSoftBg ?? "rgba(201, 125, 110, 0.12)"
          : colors.critical,
        borderRadius,
        padding: 14,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: isSoft
          ? softBorderColor ??
            t.loginAlertSoftBorder ??
            "rgba(201, 125, 110, 0.35)"
          : "rgba(255,255,255,0.15)",
      }}
      accessibilityRole="alert"
    >
      <Text
        style={{
          flex: 1,
          fontFamily: bodyFontFamily,
          fontSize: 14,
          lineHeight: 20,
          color: isSoft
            ? softTextColor ?? t.loginAlertSoftText ?? "#E8D5D0"
            : colors.white,
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
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Text
            style={{
              fontFamily: dismissFontFamily,
              fontSize: 18,
              color: isSoft
                ? softTextColor ?? t.loginAlertSoftText ?? t.alertSoftText
                : t.alertErrorText,
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
