import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { colors, spacing, radii } from "@/theme";

const STORAGE_KEY = "responder_notification_settings";

function ToggleRow({ label, description, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && (
          <Text style={styles.toggleDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent + "80" }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [caseAlerts, setCaseAlerts] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setCaseAlerts(parsed.caseAlerts !== false);
        setStatusUpdates(parsed.statusUpdates !== false);
      } catch (e) {
        console.error("Failed loading notification settings:", e);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ caseAlerts, statusUpdates })
      );
      Alert.alert("Saved", "Notification settings updated.");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not save settings.");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 20, paddingBottom: spacing.lg },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.card}>
        <ToggleRow
          label="New case alerts"
          description="Push when a case is assigned to you"
          value={caseAlerts}
          onValueChange={setCaseAlerts}
        />
        <View style={styles.separator} />
        <ToggleRow
          label="Status reminders"
          description="Remind when case status needs update"
          value={statusUpdates}
          onValueChange={setStatusUpdates}
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: "SpaceGrotesk_700Bold",
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
  },
  toggleLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: colors.text,
  },
  toggleDescription: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  saveButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: colors.white,
  },
});
