import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AlertCircle, X } from "lucide-react-native";

export default function ErrorAlert({ message, onDismiss, variant = "login" }) {
  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: "#FF3B30",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <AlertCircle size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: "#FFFFFF",
        }}
      >
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
