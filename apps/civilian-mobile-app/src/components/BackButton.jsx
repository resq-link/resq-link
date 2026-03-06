import React from "react";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function BackButton({
  style,
  onPress,
  size = 24,
  variant = "login",
  iconColor = "#FFFFFF",
}) {
  const router = useRouter();

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
        backgroundColor: "#3B3B3B",
        ...style,
      };
    }

    return {
      ...baseStyle,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#252525",
      borderWidth: 1,
      borderColor: "#404040",
      ...style,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      accessibilityLabel="Go back"
    >
      <ChevronLeft size={variant === "register" ? 20 : size} color={iconColor} />
    </TouchableOpacity>
  );
}
