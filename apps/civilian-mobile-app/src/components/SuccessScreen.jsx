import React from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CheckCircle } from "lucide-react-native";

export default function SuccessScreen({
  title = "Success!",
  subtitle = "Operation completed successfully",
  variant = "login",
}) {
  const getAccentColor = () => {
    return variant === "register" ? "#9AFF65" : "#9AFF55";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" backgroundColor="#000000" />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: variant === "register" ? 16 : 24,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: getAccentColor(),
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <CheckCircle size={40} color="#000000" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: "#FFFFFF",
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: variant === "register" ? "#8F8F8F" : "#9A9A9A",
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
