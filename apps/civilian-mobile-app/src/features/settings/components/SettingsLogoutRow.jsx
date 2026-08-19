import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { LogOut } from "lucide-react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { settingsIconAccents, settingsTypography } from "@/features/settings/constants/theme";

const LOGOUT_ACCENT = settingsIconAccents.logout;

function SettingsLogoutRow({ onLogout, theme, index = 0 }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  }, [scale]);

  return (
    <Animated.View
      entering={FadeInDown.duration(340).delay(120 + index * 50)}
      style={styles.wrap}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onLogout}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          android_ripple={{ color: "rgba(239, 68, 68, 0.22)" }}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.logoutBg,
              borderColor: theme.logoutBorder,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Logout, sign out safely"
        >
          <LogOut size={18} color={LOGOUT_ACCENT} strokeWidth={2.2} />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: LOGOUT_ACCENT }]}>Logout</Text>
            <Text style={[styles.subtitle, { color: theme.logoutSubtitle }]}>
              Sign out safely
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default memo(SettingsLogoutRow);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
  },
  card: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: LOGOUT_ACCENT,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }
      : null),
  },
  pressed: {
    opacity: 0.9,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.rowTitle,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: settingsTypography.rowSubtitle,
    marginTop: 2,
  },
});
