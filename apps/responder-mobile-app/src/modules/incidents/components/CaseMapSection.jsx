import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Check, MapPin, Navigation, Navigation2 } from "lucide-react-native";
import Section from "./Section";
import { radii, spacing } from "@/theme";

const getIncidentTypeName = (type) => {
  const typeMap = {
    fire: "Fire",
    medical: "Medical Emergency",
    vehicular_accident: "Vehicular Accident",
    police_emergency: "Police Emergency",
    electrical_powerline_hazard: "Electrical / Powerline Hazard",
    other_emergency: "Other Emergency",
  };
  return typeMap[type] || "Emergency";
};

const formatElapsed = (from, to = new Date()) => {
  if (!from) return "";

  const start = new Date(from);
  const end = new Date(to);
  const diffSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export default function CaseMapSection({
  caseData,
  hasPinnedLocation,
  responderLocation,
  locationError,
  mapRegion,
  touchdownDistanceMeters,
  displayLocationText,
  handleOpenNavigation,
  formatDate,
  colors,
}) {
  const [now, setNow] = useState(new Date());
  const status = String(caseData.status || "").toLowerCase();
  const hasTouchdown = !!caseData.touchdownAt;
  const hasPostReport = !!caseData.postIncidentReport?.submittedAt;
  const isResolved = status === "done" || status === "resolved" || hasPostReport;
  const isEnRouteOrBeyond =
    status === "enroute" ||
    status === "on_scene" ||
    isResolved ||
    hasTouchdown;
  const acceptedTime = caseData.acceptedAt || (isEnRouteOrBeyond ? caseData.createdAt : null);
  const touchdownComplete = hasTouchdown || status === "on_scene" || isResolved;
  const enRouteActive = !!acceptedTime && !touchdownComplete && isEnRouteOrBeyond;

  useEffect(() => {
    if (!enRouteActive) return undefined;

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [enRouteActive]);

  const progressSteps = useMemo(
    () => [
      {
        key: "accepted",
        label: "Accepted",
        detail: acceptedTime ? "Case accepted" : "Waiting",
        state: acceptedTime ? "completed" : "active",
        icon: Check,
      },
      {
        key: "enroute",
        label: "En Route",
        detail: enRouteActive
          ? `${formatElapsed(acceptedTime, now)} en route`
          : touchdownComplete
            ? "Travel complete"
            : "Pending",
        state: touchdownComplete ? "completed" : enRouteActive ? "active" : "future",
        icon: Navigation,
      },
      {
        key: "touchdown",
        label: "Touchdown",
        detail: hasTouchdown
          ? formatDate(caseData.touchdownAt)
          : touchdownComplete
            ? "Arrived"
            : "Pending",
        state: touchdownComplete ? "completed" : "future",
        icon: MapPin,
      },
    ],
    [
      acceptedTime,
      caseData.touchdownAt,
      enRouteActive,
      formatDate,
      hasTouchdown,
      now,
      touchdownComplete,
    ]
  );

  const renderProgressIcon = (step) => {
    const Icon = step.icon;
    const isCompleted = step.state === "completed";
    const isActive = step.state === "active";
    const iconBg = isCompleted || isActive ? colors.accent : colors.surfaceHighlight;
    const iconColor = isCompleted || isActive ? "#FFFFFF" : colors.textMuted;
    const borderColor = isCompleted || isActive ? colors.accent : colors.border;

    return (
      <View style={[styles.progressIcon, { backgroundColor: iconBg, borderColor }]}>
        <Icon size={15} color={iconColor} strokeWidth={2.5} />
      </View>
    );
  };

  return (
    <Section title="Location & Map" colors={colors}>
      {hasPinnedLocation && (
        <View style={[styles.mapShell, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            accessibilityLabel="Interactive map showing responder and incident locations"
          >
            <Marker
              coordinate={{
                latitude: caseData.latitude,
                longitude: caseData.longitude,
              }}
              title={getIncidentTypeName(caseData.incidentCategory)}
              description={displayLocationText || "Pinned incident location"}
              pinColor={colors.accent}
            />
            {responderLocation && (
              <Marker
                coordinate={responderLocation}
                pinColor={colors.info}
              />
            )}
          </MapView>
          <TouchableOpacity
            style={[styles.mapFab, { backgroundColor: colors.info }]}
            onPress={handleOpenNavigation}
            activeOpacity={0.85}
            accessibilityLabel="Open Google Maps navigation"
            accessibilityRole="button"
          >
            <Navigation2 size={15} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.mapFabText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.progressShell, { borderColor: colors.border, backgroundColor: colors.surfaceHighlight }]}>
        <View style={styles.progressLineWrap} pointerEvents="none">
          <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
          <View
            style={[
              styles.progressLineFill,
              {
                backgroundColor: colors.accent,
                width: touchdownComplete ? "100%" : acceptedTime ? "50%" : "0%",
              },
            ]}
          />
        </View>
        {progressSteps.map((step) => (
          <View key={step.key} style={styles.progressStep}>
            {renderProgressIcon(step)}
            <Text
              style={[
                styles.progressLabel,
                {
                  color:
                    step.state === "active"
                      ? colors.accent
                      : step.state === "completed"
                        ? colors.text
                        : colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
            <Text
              style={[
                styles.progressDetail,
                { color: step.state === "active" ? colors.accent : colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {step.detail}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: hasPinnedLocation ? spacing.md : 0 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 15,
            color: colors.text,
          }}
        >
          {displayLocationText || "Location not available"}
        </Text>

        {caseData.landmark && (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Nearest landmark: {caseData.landmark}
          </Text>
        )}

        {caseData.peopleInvolved != null && (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.surfaceHighlight,
              borderRadius: radii.sm,
              paddingVertical: 3,
              paddingHorizontal: 8,
              marginTop: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              People involved: {caseData.peopleInvolved}
            </Text>
          </View>
        )}

        {locationError ? (
          <Text style={[styles.locationErrorText, { color: colors.warning }]}>{locationError}</Text>
        ) : null}

        {touchdownDistanceMeters != null && !caseData.touchdownAt ? (
          <Text style={[styles.touchdownDistanceText, { color: colors.textSecondary }]}>
            Distance to pinned location: {touchdownDistanceMeters.toFixed(1)} m
          </Text>
        ) : null}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    height: 280,
    width: "100%",
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  progressShell: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    position: "relative",
  },
  progressLineWrap: {
    position: "absolute",
    top: spacing.md + 15,
    left: "16.5%",
    right: "16.5%",
    height: 2,
  },
  progressLine: {
    ...StyleSheet.absoluteFillObject,
  },
  progressLineFill: {
    height: 2,
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  progressIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    zIndex: 2,
  },
  progressLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    textAlign: "center",
  },
  progressDetail: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
    textAlign: "center",
  },
  locationErrorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: spacing.sm,
  },
  mapFab: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  mapFabText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  touchdownDistanceText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
