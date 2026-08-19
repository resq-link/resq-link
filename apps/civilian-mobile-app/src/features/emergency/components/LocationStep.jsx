import React, { useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MapPin, Navigation, Pencil, RefreshCw } from "lucide-react-native";
import MiniMapPreview from "./MiniMapPreview";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function accuracyLabel(accuracy) {
  if (accuracy == null) return "Locating";
  if (accuracy <= 20) return "High accuracy";
  if (accuracy <= 80) return "Good accuracy";
  return "Approximate";
}

export default function LocationStep({
  locationText,
  onChangeLocationText,
  latitude,
  longitude,
  locationAccuracy,
  locationStatus,
  isGettingLocation,
  manualMapMode,
  mapRegion,
  onRefresh,
  onEditManually,
  onManualPin,
  onMount,
}) {
  const { reportTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      heading: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.title,
        color: t.text,
        marginBottom: 8,
      },
      subheading: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
      },
      card: {
        backgroundColor: t.card,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: t.border,
        shadowColor: t.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 5,
      },
      cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
      },
      iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: t.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
      },
      headerText: {
        flex: 1,
      },
      cardLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.6,
      },
      address: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.body,
        color: t.text,
        lineHeight: 22,
      },
      loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      loadingText: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
      },
      badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 14,
        marginBottom: 14,
      },
      badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: t.surface,
      },
      badgeSuccess: {
        backgroundColor: t.primaryMuted,
      },
      badgePending: {},
      badgeText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
      },
      badgeTextSuccess: {
        color: t.primary,
      },
      miniMapWrap: {
        marginBottom: 14,
      },
      actions: {
        flexDirection: "row",
        gap: 10,
      },
      actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: t.surface,
      },
      pressed: {
        opacity: 0.85,
      },
      actionText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption + 1,
        color: t.text,
      },
      manualSection: {
        marginTop: 20,
        gap: 10,
      },
      manualTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.body,
        color: t.text,
      },
      manualHint: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
        lineHeight: 18,
      },
      input: {
        marginTop: 12,
        minHeight: 52,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.text,
        textAlignVertical: "top",
      },
      textEditLink: {
        marginTop: 16,
        alignSelf: "flex-start",
      },
      textEditLinkText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption + 1,
        color: t.primary,
      },
    }),
    reportTheme
  );

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  const hasCoords = Boolean(latitude && longitude);
  const isConfirmed = locationStatus === "success" || locationStatus === "manual";

  return (
    <View>
      <Text style={styles.heading}>Confirm location</Text>
      <Text style={styles.subheading}>
        Responders are dispatched to this address. Refresh if you have moved.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <MapPin size={20} color={reportTheme.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.cardLabel}>Current location</Text>
            {isGettingLocation ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={reportTheme.primary} />
                <Text style={styles.loadingText}>Detecting GPS…</Text>
              </View>
            ) : (
              <Text style={styles.address} numberOfLines={3}>
                {locationText.trim() || "Waiting for location…"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              isConfirmed ? styles.badgeSuccess : styles.badgePending,
            ]}
          >
            <Navigation size={12} color={isConfirmed ? reportTheme.primary : reportTheme.textSecondary} />
            <Text
              style={[
                styles.badgeText,
                isConfirmed && styles.badgeTextSuccess,
              ]}
            >
              {isConfirmed ? accuracyLabel(locationAccuracy) : "Needs confirmation"}
            </Text>
          </View>
          {locationStatus === "manual" ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Manual pin</Text>
            </View>
          ) : null}
        </View>

        {hasCoords && !manualMapMode ? (
          <View style={styles.miniMapWrap}>
            <MiniMapPreview
              latitude={latitude}
              longitude={longitude}
              mapRegion={mapRegion}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            onPress={onRefresh}
            disabled={isGettingLocation}
            accessibilityRole="button"
            accessibilityLabel="Refresh location"
          >
            <RefreshCw size={18} color={reportTheme.text} />
            <Text style={styles.actionText}>Refresh</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            onPress={onEditManually}
            accessibilityRole="button"
            accessibilityLabel="Edit location manually"
          >
            <Pencil size={18} color={reportTheme.text} />
            <Text style={styles.actionText}>Edit manually</Text>
          </Pressable>
        </View>
      </View>

      {manualMapMode ? (
        <View style={styles.manualSection}>
          <Text style={styles.manualTitle}>Place incident pin</Text>
          <Text style={styles.manualHint}>
            Tap the map or drag the pin to mark the exact spot.
          </Text>
          <MiniMapPreview
            latitude={latitude}
            longitude={longitude}
            mapRegion={mapRegion}
            onPin={onManualPin}
            interactive
          />
          <TextInput
            style={styles.input}
            value={locationText}
            onChangeText={onChangeLocationText}
            placeholder="Street, landmark, or address"
            placeholderTextColor={reportTheme.textSecondary}
            multiline
            accessibilityLabel="Location address"
          />
        </View>
      ) : (
        <Pressable
          onPress={onEditManually}
          style={styles.textEditLink}
          accessibilityRole="button"
        >
          <Text style={styles.textEditLinkText}>Type address instead</Text>
        </Pressable>
      )}
    </View>
  );
}
