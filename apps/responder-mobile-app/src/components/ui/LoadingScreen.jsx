import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useResqTheme } from "@/theme";

export default function LoadingScreen({
  title = "Loading...",
  subtitle = "Please wait",
}) {
  const { colors, statusBarStyle, t } = useResqTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={statusBarStyle} backgroundColor={t.bg} />
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
          color={t.accent}
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
        {subtitle ? (
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
        ) : null}
      </View>
    </View>
  );
}
