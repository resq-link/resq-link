import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Bell,
  Shield,
  HelpCircle,
  Palette,
  AlertTriangle,
  CircleHelp,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { useAppTheme } from "@/utils/useAppTheme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useUserStore();
  const { colors } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push("/dashboard")}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>General Settings</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon={<Bell size={20} color={colors.text} />}
            label="Notifications"
            onPress={() => router.push("/notifications")}
            textColor={colors.text}
            separatorColor={colors.separator}
          />
          <SettingsRow
            icon={<Shield size={20} color={colors.text} />}
            label="Privacy & Security"
            onPress={() => router.push("/privacy-security")}
            textColor={colors.text}
            separatorColor={colors.separator}
          />
          <SettingsRow
            icon={<Palette size={20} color={colors.text} />}
            label="Appearance"
            onPress={() => router.push("/appearance")}
            textColor={colors.text}
            separatorColor={colors.separator}
          />
          <SettingsRow
            icon={<HelpCircle size={20} color={colors.text} />}
            label="Help & Support"
            onPress={() => router.push("/help-support")}
            textColor={colors.text}
            separatorColor={colors.separator}
            isLast
          />
        </View>

        <Text style={[styles.sectionTitle, styles.supportTitle, { color: colors.text }]}>
          Support
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon={<AlertTriangle size={20} color={colors.text} />}
            label="Report an issue"
            onPress={() => router.push("/report-issue")}
            textColor={colors.text}
            separatorColor={colors.separator}
          />
          <SettingsRow
            icon={<CircleHelp size={20} color={colors.text} />}
            label="FAQ"
            onPress={() => router.push("/faq")}
            textColor={colors.text}
            separatorColor={colors.separator}
            isLast
          />
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.text }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: colors.text }]}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  textColor,
  separatorColor,
  isLast = false,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: separatorColor },
        isLast && styles.lastRow,
      ]}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      </View>
      <ChevronRight size={18} color={textColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    marginLeft: 8,
  },
  headerSpacer: {
    width: 36,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    marginBottom: 12,
  },
  supportTitle: {
    marginTop: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    marginLeft: 12,
  },
  logoutButton: {
    marginTop: 36,
    borderWidth: 2,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 28,
    lineHeight: 32,
  },
});
