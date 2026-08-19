import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

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
  const { authTheme: theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const accentColor = theme.primaryGreen;
  const borderColor = focused ? theme.inputBorderFocus : theme.inputBorder;

  return (
    <View style={[{ marginBottom: 24 }, style]}>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: variant === "register" ? 16 : 14,
          color: theme.primaryText,
          marginBottom: 8,
        }}
      >
        {label}
        {required && <Text style={{ color: accentColor }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            height: 50,
            borderWidth: focused ? 2 : 1,
            borderColor,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingRight: secureTextEntry ? 50 : 16,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: theme.primaryText,
            backgroundColor: theme.inputBg,
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedText}
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
              <EyeOff size={20} color={theme.mutedText} />
            ) : (
              <Eye size={20} color={theme.mutedText} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
