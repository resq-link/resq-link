import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

export default function FormInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  autoCorrect = false,
  required = false,
  variant = "login",
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getBorderColor = () => {
    if (variant === "register") {
      return focused ? "#9AFF65" : "#5A5A5A";
    }
    return focused ? "#9AFF55" : "#6C6C6C";
  };

  const getAccentColor = () => {
    return variant === "register" ? "#9AFF65" : "#9AFF55";
  };

  return (
    <View style={[{ marginBottom: 24 }, style]}>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: variant === "register" ? 16 : 14,
          color: "#FFFFFF",
          marginBottom: 8,
        }}
      >
        {label}
        {required && <Text style={{ color: getAccentColor() }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            height: 50,
            borderWidth: focused ? 2 : 1,
            borderColor: getBorderColor(),
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingRight: secureTextEntry ? 50 : 16,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#FFFFFF",
            backgroundColor: variant === "register" ? "#000000" : "transparent",
          }}
          placeholder={placeholder}
          placeholderTextColor={variant === "register" ? "#C6C6C6" : "#C1C1C1"}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 16,
              top: 13,
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff size={20} color="#C1C1C1" />
            ) : (
              <Eye size={20} color="#C1C1C1" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
