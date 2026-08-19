import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Info } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Constants from "expo-constants";
import { settingsIconAccents, settingsTypography } from "@/features/settings/constants/theme";

function SettingsAboutCard({ theme, index = 0 }) {
  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.0.0";
  const buildNumber =
    Constants.expoConfig?.android?.versionCode ??
    Constants.nativeBuildVersion ??
    "—";

  return (
    <Animated.View
      entering={FadeInDown.duration(340).delay(120 + index * 50)}
      style={styles.wrap}
    >
      <Text
        style={[styles.sectionTitle, { color: theme.textSecondary }]}
        accessibilityRole="header"
      >
        About
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: `${settingsIconAccents.about}18` },
            ]}
          >
            <Info size={18} color={settingsIconAccents.about} strokeWidth={2.2} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.text }]}>RESQ-Link</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Civilian emergency response app
            </Text>
          </View>
        </View>
        <View style={[styles.metaRow, { borderTopColor: theme.separator }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
              Version
            </Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {appVersion}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.separator }]} />
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
              Build
            </Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {String(buildNumber)}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default memo(SettingsAboutCard);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.sectionTitle,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.rowTitle,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: settingsTypography.rowSubtitle,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metaItem: {
    flex: 1,
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: settingsTypography.rowSubtitle,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginTop: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 8,
  },
});
