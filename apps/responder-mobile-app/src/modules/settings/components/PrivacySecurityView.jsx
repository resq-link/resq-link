import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { spacing, useResqTheme } from "@/theme";
import { LEGAL_URLS, PRIVACY_CONTACT_EMAIL } from "@/constants/legal";
import { openLegalDocument } from "@/utils/openLegalDocument";

const DATA_SUMMARY = [
  "Work email, role, and unit assignment for your responder account",
  "Live GPS location when you enable location sharing with dispatch",
  "Push notification tokens for incident alerts",
  "Incident updates, post-report photos, and operational chat messages",
  "Device and diagnostic logs for security and reliability",
];

export default function PrivacySecurityView() {
  const { colors, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        backButton: { marginRight: spacing.md, padding: 4 },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.text,
        },
        summaryCard: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          backgroundColor: colors.surface,
        },
        summaryTitle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 16,
          color: colors.text,
          marginBottom: 10,
        },
        summaryItem: {
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 21,
          color: colors.textSecondary,
          marginBottom: 4,
        },
        summaryFootnote: {
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary,
          marginTop: 10,
        },
        card: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
        },
        row: {
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        lastRow: { borderBottomWidth: 0 },
        rowText: {
          fontFamily: "Inter_400Regular",
          fontSize: 16,
          color: colors.text,
          flex: 1,
          paddingRight: 12,
        },
      }),
    [colors]
  );

  if (!fontsLoaded) return null;

  const rows = [
    { label: "Privacy policy", url: LEGAL_URLS.privacyPolicy },
    { label: "Data privacy notice", url: LEGAL_URLS.dataPrivacyNotice },
    { label: "Terms of use", url: LEGAL_URLS.termsOfUse },
    {
      label: "Contact privacy office",
      onPress: () => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>What we collect</Text>
          {DATA_SUMMARY.map((item) => (
            <Text key={item} style={styles.summaryItem}>
              • {item}
            </Text>
          ))}
          <Text style={styles.summaryFootnote}>
            Responder accounts are provisioned by administrators. We do not sell your data. Location is shared only
            when live share is enabled.
          </Text>
        </View>

        <View style={styles.card}>
          {rows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.row, index === rows.length - 1 && styles.lastRow]}
              onPress={() => (row.onPress ? row.onPress() : openLegalDocument(row.url))}
            >
              <Text style={styles.rowText}>{row.label}</Text>
              <ExternalLink size={16} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
