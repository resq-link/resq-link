import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Clock, User, AlertCircle } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useSOS } from "../utils/useSOS";

export default function CustomBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { handleSOS, sosLoading } = useSOS();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const isHistoryActive = pathname?.includes("/history");
  const isProfileActive = pathname?.includes("/profile");

  // Use fallback font family if fonts aren't loaded yet
  const fontFamily = fontsLoaded ? "Inter_600SemiBold" : undefined;

  // Hide bottom nav on auth screens and emergency form
  const hideNavScreens = ["/login", "/register", "/emergency-form", "/emergency-confirmation"];
  const shouldHide = hideNavScreens.some(screen => 
    pathname === screen || 
    pathname?.endsWith(screen) ||
    pathname === "/" // Hide on root index screen
  );
  
  if (shouldHide) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: 0, // Remove padding, let navBar handle it
        },
      ]}
    >
      {/* Glassmorphism Navigation Bar */}
      <BlurView
        intensity={80}
        tint="dark"
        style={[
          styles.navBar,
          {
            paddingBottom: Math.max(2, insets.bottom), // Minimal padding, only safe area
          },
        ]}
      >
        {/* Semi-transparent overlay for glass effect */}
        <View style={styles.glassOverlay} />
        
        {/* Navigation Content */}
        <View style={styles.navContent}>
          {/* Left Section - History */}
          <View style={styles.navSection}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/history")}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              <Clock
                size={24}
                color={isHistoryActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)"}
              />
              <Text
                style={[
                  styles.navLabel,
                  { 
                    color: isHistoryActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                    fontFamily: fontFamily,
                  },
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center Spacer for FAB - creates the curved effect */}
          <View style={styles.fabSpacer} />

          {/* Right Section - Profile Settings */}
          <View style={styles.navSection}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              <User
                size={24}
                color={isProfileActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)"}
              />
              <Text
                style={[
                  styles.navLabel,
                  { 
                    color: isProfileActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                    fontFamily: fontFamily,
                  },
                ]}
              >
                Profile Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      {/* FAB (SOS Button) - Positioned to protrude above nav bar */}
      <TouchableOpacity
        onPress={handleSOS}
        disabled={sosLoading}
        style={[
          styles.fab,
          { bottom: insets.bottom + 15 }, // Moved down (reduced from 22 to 15)
          sosLoading && styles.fabDisabled,
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.fabInner}>
          <AlertCircle size={32} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={[styles.fabText, { fontFamily: fontFamily }]}>SOS</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    pointerEvents: "box-none", // Allow touches to pass through container
    backgroundColor: "transparent",
  },
  navBar: {
    position: "relative",
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.18)",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.18)",
    borderRightColor: "rgba(255, 255, 255, 0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10000,
    minHeight: 50, // Increased to accommodate top spacing
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(106, 27, 154, 0.3)", // Semi-transparent purple overlay
  },
  navContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8, // Increased from 3 to 8 for more top spacing
    paddingBottom: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center", // Changed to center for better alignment
    minHeight: 50, // Increased to accommodate top spacing
    position: "relative",
    zIndex: 1,
  },
  navSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center", // Changed to center for better alignment
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0, // Further reduced padding
  },
  navLabel: {
    fontSize: 12, // Increased from 10 to 12
    marginTop: 2, // Slightly increased margin
    fontWeight: "600",
  },
  fabSpacer: {
    width: 80, // Space for FAB to sit in
    height: "100%",
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30", // Red color
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 25,
    zIndex: 10001,
    borderWidth: 4,
    borderColor: "#000000", // Black border
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    fontSize: 11,
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: "600",
  },
});
