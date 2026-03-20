import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, radii, spacing } from "@/theme";

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
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.xxl }, style]}>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.text,
          marginBottom: spacing.sm,
          letterSpacing: 0.3,
        }}
      >
        {label}
        {required && <Text style={{ color: colors.critical }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            height: 52,
            borderWidth: 2,
            borderColor: focused ? colors.accent : colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.lg,
            paddingRight: secureTextEntry ? 52 : spacing.lg,
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
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
              right: spacing.lg,
              top: 14,
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
              <EyeOff size={20} color={colors.textMuted} />
            ) : (
              <Eye size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
