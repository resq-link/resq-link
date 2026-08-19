import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Shield } from "lucide-react-native";
import { useResqTheme } from "@/theme";

export default function LoadingScreen({
  title = "RESQ Responders",
  subtitle = "Preparing Mission Dashboard...",
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
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            backgroundColor: t.accentSubtle,
            borderWidth: 1,
            borderColor: t.accentBorder,
          }}
          accessibilityElementsHidden
        >
          <Shield size={34} color={t.accent} strokeWidth={1.75} />
        </View>
        <ActivityIndicator
          size="large"
          color={t.accent}
          style={{ marginBottom: 20 }}
        />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.text,
            marginBottom: 8,
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: "Inter_400Regular",
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
