import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { spacing, radii, useResqTheme } from "@/theme";

export default function HelpSupportScreen() {
  const { colors, t, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        subtitle: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: spacing.xl,
        },
        primaryButton: {
          backgroundColor: t.buttonPrimaryBg,
          borderRadius: radii.lg,
          padding: 16,
          alignItems: "center",
        },
        primaryButtonText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 16,
          color: t.buttonPrimaryText,
        },
        infoBox: {
          marginTop: spacing.xxl,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        infoTitle: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.text,
          marginBottom: 8,
        },
        infoText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 20,
        },
      }),
    [colors, t]
  );

  const openEmail = async () => {
    const url = "mailto:support@rescue.ph?subject=RESCUE%20Responder%20Support";
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Not available", "No email app available.");
      return;
    }
    await Linking.openURL(url);
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
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <Text style={styles.subtitle}>
        Need help? Contact support or get in touch with your command center.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={openEmail}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Contact support</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>In case of emergency</Text>
        <Text style={styles.infoText}>
          For urgent operational issues, contact your dispatch supervisor or
          command center directly. This app is for case management only.
        </Text>
      </View>
    </View>
  );
}
