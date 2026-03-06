import React from "react";
import { View, Text } from "react-native";

export default function OrDivider({ variant = "login" }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
      }}
    >
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: variant === "register" ? "#5A5A5A" : "#6C6C6C",
        }}
      />
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: variant === "register" ? "#8F8F8F" : "#9A9A9A",
          marginHorizontal: 16,
        }}
      >
        Or
      </Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: variant === "register" ? "#5A5A5A" : "#6C6C6C",
        }}
      />
    </View>
  );
}
