import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
  loading = false,
  ...props
}) {
  const getButtonStyle = () => {
    const baseStyle = {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    };

    if (variant === "primary") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? "#C7C7CC" : "#10b981",
        ...style,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseStyle,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#C7C7CC",
        ...style,
      };
    }

    return { ...baseStyle, ...style };
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 16,
    };

    if (variant === "primary") {
      return {
        ...baseTextStyle,
        color: "#FFFFFF",
        ...textStyle,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseTextStyle,
        color: "#10b981",
        ...textStyle,
      };
    }

    return { ...baseTextStyle, ...textStyle };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
}

