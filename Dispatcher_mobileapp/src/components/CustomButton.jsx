import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  buttonVariant = "login",
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
      marginBottom: buttonVariant === "register" ? 24 : 16,
    };

    if (variant === "primary") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? "#5A5A5A" : "#FFFFFF",
        ...style,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseStyle,
        backgroundColor: "#000000",
        borderWidth: 1,
        borderColor: buttonVariant === "register" ? "#5A5A5A" : "#5A5A5A",
        ...style,
      };
    }

    if (variant === "register") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? "#5A5A5A" : "#FFFFFF",
        ...style,
      };
    }

    return { ...baseStyle, ...style };
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontSize: 16,
      color: "#000000",
    };

    if (variant === "primary") {
      return {
        ...baseTextStyle,
        fontFamily: "Inter_600SemiBold",
        color: "#000000",
        ...textStyle,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseTextStyle,
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
        ...textStyle,
      };
    }

    if (variant === "register") {
      return {
        ...baseTextStyle,
        fontFamily: "Inter_600SemiBold",
        color: "#000000",
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
