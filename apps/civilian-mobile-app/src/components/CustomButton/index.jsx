import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

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
  const { authTheme: theme } = useAppTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      height: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: buttonVariant === "register" ? 24 : 16,
    };

    if (variant === "primary" || variant === "register") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? theme.buttonDisabledBg : theme.buttonPrimaryBg,
        ...style,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseStyle,
        backgroundColor: theme.buttonSecondaryBg,
        borderWidth: 1,
        borderColor: theme.inputBorder,
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

    if (variant === "primary" || variant === "register") {
      return {
        ...baseTextStyle,
        color: theme.buttonPrimaryText,
        ...textStyle,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseTextStyle,
        color: theme.buttonSecondaryText,
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
