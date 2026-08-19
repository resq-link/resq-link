import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AlertCircle, X } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function ErrorAlert({ message, onDismiss }) {
  const { colors } = useAppTheme();

  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: colors.errorBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.errorBorder,
      }}
    >
      <AlertCircle size={20} color={colors.error} style={{ marginRight: 12 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: colors.errorText,
        }}
      >
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <X size={20} color={colors.errorText} />
        </TouchableOpacity>
      )}
    </View>
  );
}
