import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { radii, spacing, useResqTheme } from "@/theme";

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
  /** Optional left icon (e.g. Lucide icon as <Mail size={20} color="..." />). */
  leftIcon,
  /** Override focus border color (defaults to theme accent). */
  focusAccentColor,
  /** Override default border color. */
  borderColor,
  /** Input background. */
  inputBackgroundColor,
  /** Label and input text colors. */
  labelColor,
  textColor,
  placeholderColor,
  /** Required asterisk color (defaults to critical red). */
  requiredColor,
  /** Input min height for field-friendly tap targets. */
  minHeight = 52,
  /** Corner radius (default theme md). */
  borderRadius = radii.md,
  style,
  ...props
}) {
  const { colors, t } = useResqTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderCol = borderColor ?? t.borderSolid;
  const focusCol = focusAccentColor ?? t.accent;
  const bgCol = inputBackgroundColor ?? t.inputBg;
  const lblCol = labelColor ?? colors.text;
  const txtCol = textColor ?? colors.text;
  const phCol = placeholderColor ?? t.inputPlaceholder;
  const reqCol = requiredColor ?? t.critical;

  const horizontalPad = spacing.lg;
  const leftPad = leftIcon ? 48 : horizontalPad;
  /** Extra right padding so text does not run under the visibility toggle. */
  const rightPad = secureTextEntry ? 56 : horizontalPad;

  /**
   * Android: `elevation` on TextInput draws above adjacent siblings and hides
   * left/right overlays (mail icon, password toggle). Skip glow on those rows.
   */
  const applyFocusGlow = Boolean(
    focused && focusAccentColor && !secureTextEntry && !leftIcon
  );

  return (
    <View style={[{ marginBottom: spacing.xxl }, style]}>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: lblCol,
          marginBottom: spacing.sm,
          letterSpacing: 0.3,
        }}
      >
        {label}
        {required && <Text style={{ color: reqCol }}> *</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            minHeight,
            borderWidth: 1.5,
            borderColor: focused ? focusCol : borderCol,
            borderRadius,
            paddingLeft: leftPad,
            paddingRight: rightPad,
            paddingVertical: 14,
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 16,
            color: txtCol,
            backgroundColor: bgCol,
            ...(applyFocusGlow
              ? {
                  shadowColor: focusCol,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: Platform.OS === "ios" ? 0.35 : 0,
                  shadowRadius: 8,
                  elevation: Platform.OS === "android" ? 4 : 0,
                }
              : {}),
          }}
          placeholder={placeholder}
          placeholderTextColor={phCol}
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
        {leftIcon ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: horizontalPad - 2,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 32,
              zIndex: 10,
              ...(Platform.OS === "android" ? { elevation: 12 } : {}),
            }}
          >
            {leftIcon}
          </View>
        ) : null}
        {secureTextEntry && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              right: horizontalPad - 4,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 48,
              zIndex: 10,
              ...(Platform.OS === "android" ? { elevation: 12 } : {}),
            }}
          >
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={22} color={phCol} />
              ) : (
                <Eye size={22} color={phCol} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
