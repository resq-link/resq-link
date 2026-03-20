import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme";

export default function LoadingScreen({
  title = "Loading...",
  subtitle = "Please wait",
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginBottom: 24 }}
        />
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 18,
            color: colors.text,
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
