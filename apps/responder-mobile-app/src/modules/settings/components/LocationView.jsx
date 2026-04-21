import React, { useEffect, useMemo, useState } from "react";
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
import { spacing, radii, useResqTheme } from "@/theme";

import { LOCATION_PAUSED_KEY } from "@/constants/location";

export default function LocationView() {
  const { colors, t, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [locationPaused, setLocationPaused] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
        },
        toggleContent: {
          flex: 1,
          marginRight: spacing.md,
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
          marginTop: 8,
        },
        infoBox: {
          marginTop: spacing.xl,
          padding: spacing.lg,
        },
        infoText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 13,
          color: colors.textMuted,
          lineHeight: 20,
        },
      }),
    [colors]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_PAUSED_KEY);
        setLocationPaused(raw === "true");
      } catch (e) {
        console.error("Failed loading location setting:", e);
      }
    };
    load();
  }, []);

  const handleToggle = async (value) => {
    try {
      await AsyncStorage.setItem(LOCATION_PAUSED_KEY, String(value));
      setLocationPaused(value);
      Alert.alert(
        value ? "Location paused" : "Location sharing resumed",
        value
          ? "Your location will not be sent to dispatch until you resume."
          : "Your location is now being shared with the command center."
      );
    } catch (e) {
      Alert.alert("Error", "Could not save setting.");
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
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Location sharing</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleLabel}>Share location with dispatch</Text>
            <Text style={styles.toggleDescription}>
              When on, your location is sent to the command center so they can
              coordinate response. Turn off when off duty or when you need
              privacy.
            </Text>
          </View>
          <Switch
            value={!locationPaused}
            onValueChange={(v) => handleToggle(!v)}
            trackColor={{ false: t.switchTrackOff, true: t.switchTrackOn }}
            thumbColor={!locationPaused ? t.switchThumbOn : t.switchThumbOff}
            ios_backgroundColor={t.switchTrackOff}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Location updates are sent while you are logged in. Pausing stops
          updates until you resume or log out.
        </Text>
      </View>
    </View>
  );
}
