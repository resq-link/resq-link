import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { signOut, auth, setDispatcherOnlineStatus } from "@packages/firebase";
import useUserStore from "@/utils/userStore";
import { colors, spacing, radii } from "@/theme";

function SettingsRow({ label, onPress, isLast }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, isLast && styles.rowLast]}
      activeOpacity={0.7}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await setDispatcherOnlineStatus(false);
      await signOut(auth);
      await logout();
      router.replace("/login");
    } catch (e) {
      try {
        await setDispatcherOnlineStatus(false);
      } catch (_) {}
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!fontsLoaded) return null;

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          {user?.email || "Responder"}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Operational</Text>
        <View style={styles.card}>
          <SettingsRow
            label="Notifications"
            onPress={() => router.push("/notifications")}
          />
          <SettingsRow
            label="Location sharing"
            onPress={() => router.push("/location")}
            isLast
          />
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Support
        </Text>
        <View style={styles.card}>
          <SettingsRow
            label="Help & Support"
            onPress={() => router.push("/help-support")}
          />
          <SettingsRow
            label="About"
            onPress={() => router.push("/about")}
            isLast
          />
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>
            {isLoggingOut ? "Signing out..." : "Log Out"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  logoutButton: {
    marginTop: spacing.xxl,
    backgroundColor: "transparent",
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.critical + "80",
    alignItems: "center",
  },
  logoutText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: colors.critical,
  },
});
