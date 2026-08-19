import React from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CheckCircle } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function SuccessScreen({
  title = "Success!",
  subtitle = "Operation completed successfully",
}) {
  const { colors, authTheme: theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />
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
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.primaryGreen,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <CheckCircle size={40} color={theme.ctaText} />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: colors.text,
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
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
      </View>
    </View>
  );
}
