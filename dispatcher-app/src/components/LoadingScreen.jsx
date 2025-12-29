import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function LoadingScreen({
  title = "Loading...",
  subtitle = "Please wait",
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <StatusBar style="dark" backgroundColor="#F5F5F5" />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" style={{ marginBottom: 20 }} />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: "#1C1C1E",
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#8E8E93",
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

