import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MapPin, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

function LiveIncidentMapCard({ reportId, colors, isLight }) {
  const router = useRouter();
  const primary = isLight ? "#34C759" : "#7CFF4D";
  const primarySoft = isLight
    ? "rgba(52, 199, 89, 0.12)"
    : "rgba(124, 255, 77, 0.14)";

  const handleOpenMap = useCallback(() => {
    router.push({
      pathname: "/responder-map",
      params: { reportId },
    });
  }, [reportId, router]);

  return (
    <Pressable
      onPress={handleOpenMap}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: primarySoft, opacity: pressed ? 0.88 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open Live Incident Map"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${primary}20` }]}>
        <MapPin size={18} color={primary} strokeWidth={2.4} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.text }]}>
          Live Incident Map
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          Track responders, ETA, and route
        </Text>
      </View>
      <ChevronRight size={18} color={primary} strokeWidth={2.4} />
    </Pressable>
  );
}

export default memo(LiveIncidentMapCard);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
