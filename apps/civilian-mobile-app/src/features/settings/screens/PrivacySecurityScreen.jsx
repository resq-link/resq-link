import React from "react";
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
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LEGAL_URLS, PRIVACY_CONTACT_EMAIL } from "@/constants/legal";
import { openLegalDocument } from "@/utils/openLegalDocument";

const DATA_SUMMARY = [
  "Name, address, phone, and email for your account",
  "Government ID type and photo for manual identity verification (KYC)",
  "Location when you report an emergency or use location features",
  "Photos and descriptions you attach to incident reports",
  "Device and diagnostic logs for security and reliability",
];

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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
        <Text style={[styles.title, { color: colors.text }]}>Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>What we collect</Text>
          {DATA_SUMMARY.map((item) => (
            <Text key={item} style={[styles.summaryItem, { color: colors.textSecondary }]}>
              • {item}
            </Text>
          ))}
          <Text style={[styles.summaryFootnote, { color: colors.textSecondary }]}>
            We do not sell your data. ID photos are reviewed only by authorized administrators for verification.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RowItem
            label="Privacy policy"
            onPress={() => openLegalDocument(LEGAL_URLS.privacyPolicy, "Privacy policy")}
            textColor={colors.text}
            separatorColor={colors.separator}
            external
          />
          <RowItem
            label="Data privacy notice"
            onPress={() => openLegalDocument(LEGAL_URLS.dataPrivacyNotice, "Data privacy notice")}
            textColor={colors.text}
            separatorColor={colors.separator}
            external
          />
          <RowItem
            label="Terms of use"
            onPress={() => openLegalDocument(LEGAL_URLS.termsOfUse, "Terms of use")}
            textColor={colors.text}
            separatorColor={colors.separator}
            external
          />
        <RowItem
          label="Contact privacy office"
          onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}
          textColor={colors.text}
          separatorColor={colors.separator}
          external
          isLast
        />
        </View>
      </ScrollView>
    </View>
  );
}

function RowItem({ label, onPress, textColor, separatorColor, isLast = false, external = false }) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: separatorColor }, isLast && styles.lastRow]}
      onPress={onPress}
    >
      <Text style={[styles.rowText, { color: textColor }]}>{label}</Text>
      {external ? <ExternalLink size={16} color={textColor} /> : <ChevronRight size={18} color={textColor} />}
    </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 32,
  },
  summaryCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  summaryItem: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  summaryFootnote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
});
