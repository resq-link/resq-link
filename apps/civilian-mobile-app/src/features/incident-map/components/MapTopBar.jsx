import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Crosshair, RefreshCw } from "lucide-react-native";

export function MapModeBadge({ theme, label, tone = "default" }) {
  const bg = tone === "live" ? theme.liveBadgeBg : theme.badgeBg;
  const color = tone === "live" ? theme.liveBadgeText : theme.badgeText;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function MapTopBar({
  theme,
  topInset,
  isIncidentMode,
  title,
  subtitle,
  loading,
  refreshing,
  onRecenter,
  onRefresh,
}) {
  return (
    <View
      style={[
        styles.bar,
        isIncidentMode && styles.barCompact,
        {
          paddingTop: topInset + (isIncidentMode ? 6 : 8),
          backgroundColor: theme.barBg,
          borderBottomColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.mainRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <MapModeBadge
              theme={theme}
              tone={isIncidentMode ? "live" : "default"}
              label={isIncidentMode ? "Live" : "Resources"}
            />
            <Text
              style={[
                styles.title,
                isIncidentMode && styles.titleCompact,
                { color: theme.text },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
          {!loading && subtitle ? (
            <Text
              style={[
                styles.subtitle,
                isIncidentMode && styles.subtitleCompact,
                { color: theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onRefresh}
            style={[
              styles.actionBtn,
              isIncidentMode && styles.actionBtnCompact,
              {
                backgroundColor: theme.barBtnBg,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh map data"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw
                size={isIncidentMode ? 18 : 20}
                color={theme.text}
                strokeWidth={2.2}
              />
            )}
          </Pressable>
          <Pressable
            onPress={onRecenter}
            style={[
              styles.actionBtn,
              isIncidentMode && styles.actionBtnCompact,
              {
                backgroundColor: theme.barBtnBg,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Center map on my location"
          >
            <Crosshair
              size={isIncidentMode ? 18 : 20}
              color={theme.text}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Approximate content height below the status bar — used for map padding. */
export const MAP_TOP_BAR_BODY_HEIGHT = 72;

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  barCompact: {
    paddingBottom: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  titleCompact: {
    fontSize: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 2,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
});
