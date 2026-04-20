import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LayoutDashboard, Map, Bell, Settings } from "lucide-react-native";
import { useResqTheme, dashboardThemeDark, dashboardThemeLight } from "@/theme";

/**
 * Primary app navigation: exactly four tabs (Dashboard, Map, Notifications, Settings).
 * Used as `tabBar` for `app/(tabs)/_layout.jsx` — not shown on auth, incident, or support stacks.
 *
 * @param {import("@react-navigation/bottom-tabs").BottomTabBarProps} props
 */
export default function MainTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useResqTheme();

  const navPalette =
    resolvedScheme === "dark" ? dashboardThemeDark : dashboardThemeLight;

  const navChrome = useMemo(
    () => ({
      navBorder: navPalette.navBorder,
      navActiveBg: navPalette.navActiveBg,
      navGlassOverlay: navPalette.navGlassOverlay,
      accent: navPalette.navAccent,
      textSecondary: navPalette.textSecondary,
    }),
    [navPalette]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          width: 360,
          maxWidth: "96%",
          minHeight: 64,
          borderRadius: 32,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: navChrome.navBorder,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: resolvedScheme === "light" ? 0.12 : 0.38,
          shadowRadius: 16,
          elevation: 14,
        },
        glassOverlay: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: navChrome.navGlassOverlay,
        },
        navContent: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 4,
          paddingVertical: 8,
        },
        iconButton: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: 20,
          flex: 1,
        },
        iconButtonActive: {
          backgroundColor: navChrome.navActiveBg,
        },
        label: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 10,
          color: navChrome.textSecondary,
          marginTop: 4,
          textAlign: "center",
        },
        labelActive: {
          color: navChrome.accent,
        },
      }),
    [navChrome, resolvedScheme]
  );

  const activeRouteName = state.routes[state.index]?.name;

  const tabs = useMemo(
    () => [
      {
        name: "dashboard",
        label: "Dashboard",
        Icon: LayoutDashboard,
        accessibilityLabel: "Go to dashboard",
      },
      {
        name: "map",
        label: "Map",
        Icon: Map,
        accessibilityLabel: "Go to map",
      },
      {
        name: "notifications",
        label: "Notifications",
        Icon: Bell,
        accessibilityLabel: "Notifications",
      },
      {
        name: "settings",
        label: "Settings",
        Icon: Settings,
        accessibilityLabel: "Settings",
      },
    ],
    []
  );

  const blurTint = resolvedScheme === "light" ? "light" : "dark";

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <BlurView intensity={resolvedScheme === "light" ? 55 : 70} tint={blurTint} style={styles.navBar}>
        <View style={styles.glassOverlay} />
        <View style={styles.navContent}>
          {tabs.map(({ name, label, Icon, accessibilityLabel }) => {
            const focused = activeRouteName === name;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => navigation.navigate(name)}
                style={[styles.iconButton, focused && styles.iconButtonActive]}
                activeOpacity={0.8}
                accessibilityLabel={accessibilityLabel}
              >
                <Icon
                  size={22}
                  color={focused ? navChrome.accent : navChrome.textSecondary}
                  strokeWidth={focused ? 2.25 : 2}
                />
                <Text
                  style={[styles.label, focused && styles.labelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
