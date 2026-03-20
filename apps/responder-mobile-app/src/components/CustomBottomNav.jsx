import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { LayoutDashboard, Map, Settings } from "lucide-react-native";
import useUserStore from "@/utils/userStore";
import { colors } from "@/theme";

export default function CustomBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();

  const isDashboardActive = pathname === "/dashboard";
  const isMapActive = pathname === "/map";
  const isSettingsActive = pathname === "/settings";

  const hideNavScreens = [
    "/login",
    "/case-detail",
    "/notifications",
    "/location",
    "/help-support",
    "/about",
  ];
  const shouldHide =
    hideNavScreens.some(
      (screen) =>
        pathname === screen ||
        pathname?.endsWith(screen) ||
        pathname === "/"
    ) || !user;

  if (shouldHide) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <BlurView
        intensity={70}
        tint="dark"
        style={styles.navBar}
      >
        <View style={styles.glassOverlay} />
        <View style={styles.navContent}>
          <TouchableOpacity
            onPress={() => router.push("/dashboard")}
            style={[styles.iconButton, isDashboardActive && styles.iconButtonActive]}
            activeOpacity={0.8}
            accessibilityLabel="Go to dashboard"
          >
            <LayoutDashboard
              size={22}
              color={isDashboardActive ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.label,
                isDashboardActive && styles.labelActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/map")}
            style={[styles.iconButton, isMapActive && styles.iconButtonActive]}
            activeOpacity={0.8}
            accessibilityLabel="Go to map"
          >
            <Map
              size={22}
              color={isMapActive ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.label,
                isMapActive && styles.labelActive,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.iconButton, isSettingsActive && styles.iconButtonActive]}
            activeOpacity={0.8}
            accessibilityLabel="Settings"
          >
            <Settings
              size={22}
              color={isSettingsActive ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.label,
                isSettingsActive && styles.labelActive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    pointerEvents: "box-none",
    backgroundColor: "transparent",
  },
  navBar: {
    flexDirection: "row",
    width: 340,
    minHeight: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(19, 23, 30, 0.9)",
  },
  navContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  iconButtonActive: {
    backgroundColor: "rgba(232, 93, 4, 0.15)",
  },
  label: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  labelActive: {
    color: colors.accent,
  },
});
