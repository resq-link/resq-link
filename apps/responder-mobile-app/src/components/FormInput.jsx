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
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[{ marginBottom: 24 }, style]}>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: "#f1f5f9",
          marginBottom: 8,
        }}
      >
        {label}
        {required && <Text style={{ color: "#f87171" }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            height: 50,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? "#3b82f6" : "#334155",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingRight: secureTextEntry ? 50 : 16,
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 16,
            color: "#94a3b8",
            padding: 8,
            backgroundColor: "#1e293b",
          }}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
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
              <EyeOff size={20} color="#8E8E93" />
            ) : (
              <Eye size={20} color="#8E8E93" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

