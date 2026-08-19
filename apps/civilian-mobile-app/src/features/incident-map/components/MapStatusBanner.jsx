import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AlertCircle, MapPin, WifiOff } from "lucide-react-native";
import { formatRelativeUpdatedAt } from "@/features/incident-map/utils/mapCache";

export function MapDataErrorBanner({ theme, message, onRetry, topOffset }) {
  return (
    <Pressable
      onPress={onRetry}
      style={[
        styles.banner,
        styles.errorBanner,
        {
          top: topOffset,
          backgroundColor: theme.errorSoft ?? "#FDEBEC",
          borderColor: theme.error ?? "#FF3B30",
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${message}. Tap to retry.`}
    >
      <AlertCircle size={16} color={theme.error ?? "#FF3B30"} strokeWidth={2.2} />
      <Text style={[styles.bannerText, { color: theme.error ?? "#B42318" }]}>
        {message}
      </Text>
    </Pressable>
  );
}

export function MapOfflineBanner({ theme, lastUpdatedAt, topOffset }) {
  const relative = formatRelativeUpdatedAt(lastUpdatedAt);

  return (
    <View
      style={[
        styles.banner,
        {
          top: topOffset,
          backgroundColor: theme.warningSoft ?? theme.primarySoft,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={
        relative
          ? `Offline. Last updated ${relative}.`
          : "Offline. Showing cached map data."
      }
    >
      <WifiOff size={16} color={theme.textSecondary} strokeWidth={2.2} />
      <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
        {relative ? `Last updated ${relative} · Offline` : "Offline · Showing cached data"}
      </Text>
    </View>
  );
}

export function MapLocationBanner({
  theme,
  topOffset,
  onEnableLocation,
  onDismiss,
}) {
  return (
    <View
      style={[
        styles.banner,
        styles.locationBanner,
        {
          top: topOffset,
          backgroundColor: theme.primarySoft,
          borderColor: theme.primary,
        },
      ]}
    >
      <MapPin size={16} color={theme.primary} strokeWidth={2.2} />
      <Text style={[styles.bannerText, styles.locationText, { color: theme.text }]}>
        Location access is off. Enable it to see your position on the map.
      </Text>
      <Pressable
        onPress={onEnableLocation}
        style={[styles.actionBtn, { backgroundColor: theme.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Enable location in settings"
      >
        <Text style={styles.actionBtnText}>Enable</Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss location prompt"
      >
        <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  errorBanner: {
    justifyContent: "flex-start",
  },
  locationBanner: {
    flexWrap: "wrap",
  },
  bannerText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  locationText: {
    fontFamily: "Inter_400Regular",
    minWidth: "50%",
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  dismissText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 4,
  },
});
