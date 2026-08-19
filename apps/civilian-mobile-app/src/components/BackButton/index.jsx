import React from "react";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function BackButton({
  style,
  onPress,
  size = 24,
  variant = "login",
  iconColor,
}) {
  const { authTheme: theme } = useAppTheme();
  const router = useRouter();
  const resolvedIconColor = iconColor ?? theme.primaryText;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      justifyContent: "center",
      alignItems: "center",
    };

    if (variant === "register") {
      return {
        ...baseStyle,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.backButtonBg,
        ...style,
      };
    }

    return {
      ...baseStyle,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.backButtonBg,
      borderWidth: 1,
      borderColor: theme.backButtonBorder,
      ...style,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      accessibilityLabel="Go back"
    >
      <ChevronLeft size={variant === "register" ? 20 : size} color={resolvedIconColor} />
    </TouchableOpacity>
  );
}
