import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { radii, useResqTheme } from "@/theme";

export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
  ...props
}) {
  const { colors, t } = useResqTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    };

    if (variant === "primary") {
      return {
        ...baseStyle,
        backgroundColor: disabled ? colors.disabled : colors.accent,
        ...style,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseStyle,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: colors.accent,
        ...style,
      };
    }

    return { ...baseStyle, ...style };
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 16,
      letterSpacing: 0.5,
    };

    if (variant === "primary") {
      return {
        ...baseTextStyle,
        color: t.buttonPrimaryText,
        ...textStyle,
      };
    }

    if (variant === "secondary") {
      return {
        ...baseTextStyle,
        color: t.buttonSecondaryText,
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
      activeOpacity={0.85}
      {...props}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
}
