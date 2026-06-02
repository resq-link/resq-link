import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { House, Clock3, CircleUserRound, AlertCircle, Video, PhoneCall } from "lucide-react-native";
import { useSOS } from "../utils/useSOS";
import { useDispatcherCall } from "../utils/useDispatcherCall";
import { useAppTheme } from "@/utils/useAppTheme";

export default function CustomBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { handleSOS, sosLoading } = useSOS();
  const { handleDispatcherCall, callLoading } = useDispatcherCall();
  const { colors, isLight } = useAppTheme();

  const isHomeActive =
    pathname === "/dashboard" || pathname?.endsWith("/dashboard");
  const isHistoryActive = pathname?.includes("/history");
  const isProfileActive = pathname?.includes("/profile");
  const isFootageActive = pathname?.includes("footage-request");

  const hideNavScreens = [
    "/login",
    "/register",
    "/emergency-form",
    "/emergency-confirmation",
    "/calling",
    "/appearance",
    "/notifications",
    "/privacy-security",
    "/help-support",
    "/report-issue",
    "/faq",
  ];
  const shouldHide = hideNavScreens.some(
    (screen) => pathname === screen || pathname?.endsWith(screen) || pathname === "/"
  );

  if (shouldHide) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <View style={styles.navRow}>
      <BlurView
        intensity={isLight ? 55 : 70}
        tint={colors.navTint}
        style={[
          styles.navBar,
          {
            borderColor: isLight ? "rgba(17, 17, 17, 0.08)" : "rgba(255, 255, 255, 0.16)",
          },
        ]}
      >
        <View
          style={[
            styles.glassOverlay,
            {
              backgroundColor: isLight ? "rgba(255, 255, 255, 0.7)" : "rgba(20, 20, 20, 0.5)",
            },
          ]}
        />

        <View style={styles.navContent}>
          <TouchableOpacity
            onPress={() => router.push("/dashboard")}
            style={[
              styles.iconButton,
              isHomeActive && { backgroundColor: isLight ? "#F0F1F5" : "#2A2A2A" },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Go to home"
          >
            <House size={20} color={isHomeActive ? colors.text : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/history")}
            style={[
              styles.iconButton,
              isHistoryActive && { backgroundColor: isLight ? "#F0F1F5" : "#2A2A2A" },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Go to history"
          >
            <Clock3 size={20} color={isHistoryActive ? colors.text : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            style={[
              styles.iconButton,
              isProfileActive && { backgroundColor: isLight ? "#F0F1F5" : "#2A2A2A" },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Go to profile settings"
          >
            <CircleUserRound size={20} color={isProfileActive ? colors.text : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/footage-request")}
            style={[
              styles.iconButton,
              isFootageActive && { backgroundColor: isLight ? "#F0F1F5" : "#2A2A2A" },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Footage request"
          >
            <Video size={20} color={isFootageActive ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </BlurView>

      <TouchableOpacity
        onPress={handleDispatcherCall}
        disabled={callLoading}
        style={[
          styles.callFab,
          { borderColor: isLight ? "#FFFFFF" : "#141414" },
          callLoading && styles.fabDisabled,
        ]}
        activeOpacity={0.85}
        accessibilityLabel="Call command center"
      >
        <PhoneCall size={23} color="#06140B" strokeWidth={2.5} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSOS}
        disabled={sosLoading}
        style={[
          styles.fab,
          { borderColor: isLight ? "#FFFFFF" : "#141414" },
          sosLoading && styles.fabDisabled,
        ]}
        activeOpacity={0.85}
        accessibilityLabel="Trigger SOS"
      >
        <AlertCircle size={24} color="#FFFFFF" strokeWidth={2.4} />
      </TouchableOpacity>
      </View>
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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navBar: {
    width: 292,
    minHeight: 68,
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  navContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 10,
    minHeight: 68,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    marginLeft: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#C74646",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 14,
    zIndex: 1000,
    borderWidth: 3,
  },
  callFab: {
    marginLeft: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#9AFF55",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 13,
    zIndex: 1000,
    borderWidth: 3,
  },
  fabDisabled: {
    opacity: 0.6,
  },
});
