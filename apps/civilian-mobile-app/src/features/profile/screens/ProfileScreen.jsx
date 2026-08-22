import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Bell,
  Palette,
  Shield,
  LifeBuoy,
  CircleHelp,
  AlertTriangle,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/stores/userStore";
import { useAppTheme } from "@/hooks/useAppTheme";
import { getBottomNavHeight } from "@/utils/navigationInsets";
import SettingsProfileHeader from "@/features/settings/components/SettingsProfileHeader";
import SettingsStatsCard from "@/features/settings/components/SettingsStatsCard";
import SettingsSection from "@/features/settings/components/SettingsSection";
import SettingsAboutCard from "@/features/settings/components/SettingsAboutCard";
import SettingsLogoutRow from "@/features/settings/components/SettingsLogoutRow";
import { useSettingsAccountStats } from "@/features/settings/hooks/useSettingsAccountStats";
import {
  createSettingsTheme,
  settingsIconAccents,
  settingsTypography,
} from "@/features/settings/constants/theme";


export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { colors, isLight } = useAppTheme();
  const stats = useSettingsAccountStats();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const theme = useMemo(
    () => createSettingsTheme(isLight, colors),
    [isLight, colors]
  );

  const sections = useMemo(
    () => [
      {
        key: "general",
        title: "General",
        items: [
          {
            key: "notifications",
            icon: Bell,
            iconColor: settingsIconAccents.notifications,
            title: "Notifications",
            subtitle: "Manage alerts",
            route: "/notifications",
          },
          {
            key: "appearance",
            icon: Palette,
            iconColor: settingsIconAccents.appearance,
            title: "Appearance",
            subtitle: "Light, dark, or system",
            route: "/appearance",
          },
        ],
      },
      {
        key: "privacy",
        title: "Privacy",
        items: [
          {
            key: "privacy-security",
            icon: Shield,
            iconColor: settingsIconAccents.privacy,
            title: "Privacy & Security",
            subtitle: "Data and account protection",
            route: "/privacy-security",
          },
        ],
      },
      {
        key: "support",
        title: "Support",
        items: [
          {
            key: "help",
            icon: LifeBuoy,
            iconColor: settingsIconAccents.help,
            title: "Help Center",
            subtitle: "Guides and contact options",
            route: "/help-support",
          },
          {
            key: "faq",
            icon: CircleHelp,
            iconColor: settingsIconAccents.faq,
            title: "FAQ",
            subtitle: "Common questions",
            route: "/faq",
          },
          {
            key: "report-issue",
            icon: AlertTriangle,
            iconColor: settingsIconAccents.reportIssue,
            title: "Report an Issue",
            subtitle: "Tell us what went wrong",
            route: "/report-issue",
          },
        ],
      },
    ],
    []
  );

  const handleNavigate = useCallback(
    (route) => {
      router.push(route);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/login");
  }, [logout, router]);

  const bottomPadding = getBottomNavHeight(insets) + 12;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={theme.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(300)}>
          <Text
            style={[styles.screenLabel, { color: theme.textSecondary }]}
            accessibilityRole="header"
          >
            Settings
          </Text>
        </Animated.View>

        <View style={styles.block}>
          <SettingsProfileHeader user={user} theme={theme} index={0} />
        </View>

        <View style={styles.block}>
          <SettingsStatsCard
            totalReports={stats.totalReports}
            activeCount={stats.activeCount}
            memberSince={stats.memberSince}
            theme={theme}
            index={1}
          />
        </View>

        {sections.map((section, sectionIndex) => (
          <SettingsSection
            key={section.key}
            title={section.title}
            items={section.items}
            theme={theme}
            onNavigate={handleNavigate}
            index={sectionIndex + 2}
          />
        ))}

        <SettingsAboutCard theme={theme} index={sections.length + 2} />

        <SettingsLogoutRow
          onLogout={handleLogout}
          theme={theme}
          index={sections.length + 3}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  screenLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.screenLabel,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 2,
  },
  block: {
    marginBottom: 10,
  },
});
