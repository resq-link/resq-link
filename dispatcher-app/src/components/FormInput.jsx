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
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
          color: "#1C1C1E",
          marginBottom: 8,
        }}
      >
        {label}
        {required && <Text style={{ color: "#FF3B30" }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            height: 50,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? "#007AFF" : "#C7C7CC",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingRight: secureTextEntry ? 50 : 16,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#1C1C1E",
            backgroundColor: "#FFFFFF",
          }}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
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

