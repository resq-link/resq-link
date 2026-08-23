import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { toast } from "@/utils/toast";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { spacing, radii, useResqTheme } from "@/theme";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/services/notificationSettingsService";

export default function NotificationsView() {
  const { colors, t, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [caseAlerts, setCaseAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: spacing.lg,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          marginBottom: spacing.lg,
        },
        backButton: {
          marginRight: spacing.md,
          padding: 4,
        },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.text,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
        },
        toggleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        toggleContent: {
          flex: 1,
          paddingRight: spacing.md,
        },
        toggleLabel: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 16,
          color: colors.text,
        },
        toggleDescription: {
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 4,
          lineHeight: 18,
        },
        note: {
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          color: colors.textMuted,
          marginTop: spacing.lg,
          lineHeight: 18,
        },
        saveButton: {
          marginTop: spacing.xxl,
          backgroundColor: t.buttonPrimaryBg,
          borderRadius: radii.lg,
          padding: 16,
          alignItems: "center",
          minHeight: 48,
        },
        saveButtonText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 16,
          color: t.buttonPrimaryText,
        },
      }),
    [colors, t]
  );

  useEffect(() => {
    loadNotificationSettings().then((settings) => {
      setCaseAlerts(settings.caseAlerts !== false);
    });
  }, []);

  const goBackOrDashboard = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/dashboard");
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveNotificationSettings({ caseAlerts });
      toast.success("Notification settings saved");
      goBackOrDashboard();
    } catch (e) {
      toast.error("Could not save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 20, paddingBottom: spacing.lg },
        ]}
      >
        <TouchableOpacity
          onPress={goBackOrDashboard}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleLabel}>Assignment alerts</Text>
            <Text style={styles.toggleDescription}>
              Sound and vibration when a new incident is assigned while on duty.
              Critical emergencies always alert.
            </Text>
          </View>
          <Switch
            value={caseAlerts}
            onValueChange={setCaseAlerts}
            trackColor={{ false: t.switchTrackOff, true: t.switchTrackOn }}
            thumbColor={caseAlerts ? t.switchThumbOn : t.switchThumbOff}
            ios_backgroundColor={t.switchTrackOff}
          />
        </View>
      </View>

      <Text style={styles.note}>
        Push notifications require a development or production build. In-app
        assignment alerts work in all environments while you are on duty.
      </Text>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
        accessibilityRole="button"
      >
        <Text style={styles.saveButtonText}>{isSaving ? "Saving…" : "Save Settings"}</Text>
      </TouchableOpacity>
    </View>
  );
}
