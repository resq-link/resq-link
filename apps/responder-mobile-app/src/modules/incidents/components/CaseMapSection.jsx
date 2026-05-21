import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Navigation2 } from "lucide-react-native";
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

export default function CaseMapSection({
  caseData,
  hasPinnedLocation,
  responderLocation,
  locationError,
  mapRegion,
  touchdownDistanceMeters,
  canMarkTouchdown,
  isTouchdownUpdating,
  handleTouchdown,
  handleOpenNavigation,
  formatDate,
  setIsPostReportModalVisible,
  setError,
  colors,
}) {
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
              description={caseData.locationText || "Pinned incident location"}
              pinColor={colors.accent}
            />
            {responderLocation && (
              <Marker
                coordinate={responderLocation}
                title="Your current location"
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

      <View style={{ marginTop: hasPinnedLocation ? spacing.md : 0 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 15,
            color: colors.text,
          }}
        >
          {caseData.locationText || "Location not available"}
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

        {hasPinnedLocation && (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 8,
            }}
          >
            Coordinates: {caseData.latitude.toFixed(6)}, {caseData.longitude.toFixed(6)}
          </Text>
        )}

        {responderLocation ? (
          <Text style={[styles.currentLocationText, { color: colors.info }]}>
            Your location: {responderLocation.latitude.toFixed(6)},{" "}
            {responderLocation.longitude.toFixed(6)}
          </Text>
        ) : null}

        {locationError ? (
          <Text style={[styles.locationErrorText, { color: colors.warning }]}>{locationError}</Text>
        ) : null}

        {touchdownDistanceMeters != null && !caseData.touchdownAt ? (
          <Text style={[styles.touchdownDistanceText, { color: colors.textSecondary }]}>
            Distance to pinned location: {touchdownDistanceMeters.toFixed(1)} m
          </Text>
        ) : null}

        {caseData.touchdownAt ? (
          <View>
            <Text style={[styles.touchdownTimeText, { color: colors.success }]}>
              Touchdown: {formatDate(caseData.touchdownAt)}
            </Text>
            {caseData.postIncidentReport?.submittedAt ? (
              <Text style={[styles.postReportSubmittedText, { color: colors.success }]}>
                Post report sent: {formatDate(caseData.postIncidentReport.submittedAt)}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setError("");
                  setIsPostReportModalVisible(true);
                }}
                activeOpacity={0.85}
                style={[styles.postReportButton, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.postReportButtonText}>Post Report</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : canMarkTouchdown ? (
          <TouchableOpacity
            onPress={() => handleTouchdown("manual", touchdownDistanceMeters)}
            disabled={isTouchdownUpdating}
            activeOpacity={0.85}
            style={[
              styles.touchdownButton,
              { backgroundColor: colors.success },
              isTouchdownUpdating && styles.disabledButton,
            ]}
          >
            <Text style={styles.touchdownButtonText}>
              {isTouchdownUpdating ? "Marking Touchdown..." : "Touchdown"}
            </Text>
          </TouchableOpacity>
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
  currentLocationText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: 6,
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
  touchdownTimeText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 13,
    marginTop: spacing.sm,
  },
  postReportSubmittedText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: spacing.sm,
  },
  postReportButton: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  postReportButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
  touchdownButton: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  touchdownButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
