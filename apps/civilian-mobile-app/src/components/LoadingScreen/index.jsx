import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function LoadingScreen({
  title = "Loading...",
  subtitle = "Please wait",
}) {
  const { colors, authTheme: theme } = useAppTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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
        <Animated.View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 3,
            borderColor: theme.primaryGreen,
            borderTopColor: "transparent",
            marginBottom: 20,
            transform: [{ rotate: spin }],
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "transparent",
            }}
          />
        </Animated.View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
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
