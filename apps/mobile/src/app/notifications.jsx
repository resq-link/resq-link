import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/utils/useAppTheme";

const STORAGE_KEY = "notification_settings";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [pushAlerts, setPushAlerts] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [nearbyIncidents, setNearbyIncidents] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setPushAlerts(!!parsed.pushAlerts);
        setStatusUpdates(!!parsed.statusUpdates);
        setNearbyIncidents(!!parsed.nearbyIncidents);
      } catch (error) {
        console.error("Failed loading notification settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pushAlerts, statusUpdates, nearbyIncidents })
      );
      Alert.alert("Saved", "Notification settings updated.");
      router.back();
    } catch (error) {
      console.error("Failed saving notification settings:", error);
      Alert.alert("Error", "Could not save notification settings.");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingSwitchRow
          label="Push alerts"
          value={pushAlerts}
          onValueChange={setPushAlerts}
          textColor={colors.text}
          separatorColor={colors.separator}
        />
        <SettingSwitchRow
          label="Emergency status updates"
          value={statusUpdates}
          onValueChange={setStatusUpdates}
          textColor={colors.text}
          separatorColor={colors.separator}
        />
        <SettingSwitchRow
          label="Nearby incident alerts"
          value={nearbyIncidents}
          onValueChange={setNearbyIncidents}
          textColor={colors.text}
          separatorColor={colors.separator}
          isLast
        />
      </View>

      <TouchableOpacity style={[styles.saveButton, { borderColor: colors.text }]} onPress={handleSave}>
        <Text style={[styles.saveText, { color: colors.text }]}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingSwitchRow({
  label,
  value,
  onValueChange,
  textColor,
  separatorColor,
  isLast = false,
}) {
  return (
    <View style={[styles.row, { borderBottomColor: separatorColor }, isLast && styles.lastRow]}>
      <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      <View style={styles.switchWrap}>
        <Switch value={value} onValueChange={onValueChange} style={styles.switchControl} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    marginTop: 2,
  },
  card: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    flex: 1,
    paddingRight: 10,
    lineHeight: 22,
  },
  switchWrap: {
    width: 42,
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: 8,
  },
  switchControl: {
    transform: [{ scaleX: 0.62 }, { scaleY: 0.95 }],
  },
  saveButton: {
    marginTop: 24,
    borderWidth: 2,
    borderRadius: 999,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
});

