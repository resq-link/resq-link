import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
  ...props
}) {
  const getButtonStyle = () => {
    const baseStyle = {
      height: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    };

    if (variant === "primary") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? "#C7C7CC" : "#007AFF",
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
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
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
        color: "#007AFF",
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

