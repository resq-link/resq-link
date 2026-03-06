import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function LoadingScreen({
  title = "Loading...",
  subtitle = "Please wait",
  variant = "login",
}) {
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
        <Animated.View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 3,
            borderColor: getAccentColor(),
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
