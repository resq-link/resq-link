import React from "react";
import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";
import { Navigation, Phone, X } from "lucide-react-native";
import {
  formatDistanceLabel,
  getStatusBadgeStyle,
  openDirectionsUrl,
} from "@/features/incident-map/utils/mapUtils";

export default function MapFocusCard({
  marker,
  theme,
  isLight,
  onDismiss,
  bottomOffset = 280,
}) {
  if (!marker) return null;

  const badge =
    marker.markerKind === "responder"
      ? getStatusBadgeStyle(marker.status, isLight)
      : null;

  const distanceLabel = formatDistanceLabel(marker.distanceKm);
  const typeLabel =
    marker.subtitle ||
    marker.unitType ||
    (marker.kind ? marker.kind.replace(/^\w/, (c) => c.toUpperCase()) : "Resource");

  const handleCall = () => {
    if (!marker.phone) return;
    Linking.openURL(`tel:${marker.phone}`);
  };

  const handleDirections = () => {
    const url = openDirectionsUrl(marker.latitude, marker.longitude, marker.name);
    if (url) {
      Linking.openURL(url).catch(() => {
        const fallback = `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`;
        Linking.openURL(fallback);
      });
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          bottom: bottomOffset,
          backgroundColor: theme.sheetBg ?? theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow ?? "#000000",
        },
      ]}
      accessibilityViewIsModal
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {marker.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {typeLabel}
            {distanceLabel ? ` · ${distanceLabel}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss marker details"
        >
          <X size={18} color={theme.textSecondary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {marker.markerKind === "responder" && marker.status ? (
        <View style={[styles.statusPill, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.statusText, { color: badge.textColor }]}>
            {(marker.status || "unknown").replace(/_/g, " ")}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {marker.phone ? (
          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: theme.primarySoft, opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${marker.name}`}
          >
            <Phone size={16} color={theme.primary} strokeWidth={2.2} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Call</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleDirections}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: theme.cardInner ?? theme.primarySoft,
              opacity: pressed ? 0.85 : 1,
              flex: marker.phone ? 1 : undefined,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Get directions to ${marker.name}`}
        >
          <Navigation size={16} color={theme.primary} strokeWidth={2.2} />
          <Text style={[styles.actionText, { color: theme.primary }]}>
            Directions
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 28,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
