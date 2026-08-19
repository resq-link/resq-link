import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { FileText, Radio, CalendarDays } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

function StatItem({ icon: Icon, label, value, theme, accent, showDivider }) {
  return (
    <>
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
      ) : null}
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        <View style={styles.labelRow}>
          <Icon size={10} color={accent} strokeWidth={2.4} />
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </Text>
        </View>
      </View>
    </>
  );
}

function SettingsStatsCard({
  totalReports,
  activeCount,
  memberSince,
  theme,
  index = 1,
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(380).delay(index * 60)}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <StatItem
        icon={FileText}
        label="Reports"
        value={String(totalReports)}
        theme={theme}
        accent="#3B82F6"
        showDivider={false}
      />
      <StatItem
        icon={Radio}
        label="Active"
        value={String(activeCount)}
        theme={theme}
        accent={activeCount > 0 ? "#FF3B30" : theme.textMuted}
        showDivider
      />
      <StatItem
        icon={CalendarDays}
        label="Member"
        value={String(memberSince)}
        theme={theme}
        accent="#10B981"
        showDivider
      />
    </Animated.View>
  );
}

export default memo(SettingsStatsCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: 4,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
