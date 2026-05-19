import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  TextInput,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import {
  acceptCase,
  declineCase,
  markCaseTouchdown,
  submitPostIncidentReport,
  updateCaseStatus,
} from "@packages/firebase";
import useUserStore from "@/store/userStore";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import CustomButton from "@/components/ui/CustomButton";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { radii, spacing, useResqTheme } from "@/theme";

const Section = ({ title, children, colors }) => (
  <View
    style={{
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    }}
  >
    <Text
      style={{
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        textTransform: "uppercase",
        letterSpacing: 0.8,
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

const additionalDetailFields = {
  fire: [
    { key: "fireScale", label: "Fire scale / affected area" },
    { key: "structureInvolved", label: "Structure or property involved" },
    { key: "trappedOrInjured", label: "People trapped or injured" },
    { key: "fireSource", label: "Source of fire if known" },
  ],
  medical: [
    { key: "patientCondition", label: "Patient condition" },
    { key: "breathingStatus", label: "Conscious / breathing status" },
    { key: "patientAge", label: "Age or estimated age" },
    { key: "firstAidNeeds", label: "Immediate first-aid needs" },
  ],
  vehicular_accident: [
    { key: "vehiclesInvolved", label: "Vehicles involved" },
    { key: "injuredPersons", label: "Number of injured persons" },
    { key: "roadObstruction", label: "Road obstruction status" },
    { key: "collisionCause", label: "Collision type / cause if known" },
  ],
  police_emergency: [
    { key: "threatNature", label: "Nature of threat" },
    { key: "suspectPresence", label: "Suspect presence or description" },
    { key: "weaponsInvolved", label: "Weapons involved" },
    { key: "safetyRisk", label: "Immediate safety risk" },
  ],
  electrical_powerline_hazard: [
    { key: "hazardType", label: "Type of utility hazard" },
    { key: "liveWireStatus", label: "Live wire / spark / outage status" },
    { key: "affectedArea", label: "Affected homes or road area" },
    { key: "visibleDamage", label: "Visible damage details" },
  ],
  other_emergency: [
    { key: "incidentSummary", label: "Incident-specific summary" },
    { key: "whoIsAffected", label: "Who is affected" },
    { key: "hazardLevel", label: "Current hazard level" },
    { key: "supportNeeded", label: "Support needed on scene" },
  ],
};

const TOUCHDOWN_RADIUS_METERS = 10;

const getDistanceMeters = (from, to) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function CaseInfoCard({
  case: caseData,
  reporterInfo,
  onStatusUpdate,
}) {
  const { colors } = useResqTheme();

  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState(caseData.status);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeclineModalVisible, setIsDeclineModalVisible] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");
  const [responderLocation, setResponderLocation] = React.useState(null);
  const [locationError, setLocationError] = React.useState("");
  const [isTouchdownUpdating, setIsTouchdownUpdating] = React.useState(false);
  const [isPostReportModalVisible, setIsPostReportModalVisible] = React.useState(false);
  const [isSubmittingPostReport, setIsSubmittingPostReport] = React.useState(false);
  const [postReportForm, setPostReportForm] = React.useState({
    reasonForIncident: "",
    notes: "",
    peopleInvolved: "",
    peopleStatus: "",
    hospital: "",
  });
  const [error, setError] = React.useState("");
  const { user } = useUserStore();

  React.useEffect(() => {
    setSelectedStatus(caseData.status);
  }, [caseData.status]);

  const handleAcceptCase = async () => {
    if (!caseData.id) {
      setError("Case ID is missing");
      return;
    }
    try {
      setIsUpdating(true);
      setError("");
      await acceptCase(caseData.id);
      onStatusUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to accept case");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeclineCase = async () => {
    if (!caseData.id) {
      setError("Case ID is missing");
      return;
    }
    if (!declineReason.trim()) {
      setError("Decline reason is required");
      return;
    }
    try {
      setIsUpdating(true);
      setError("");
      await declineCase(caseData.id, declineReason.trim());
      setDeclineReason("");
      setIsDeclineModalVisible(false);
      onStatusUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to decline case");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!caseData.id) return;
    if (newStatus === caseData.status) return;
    if (caseData.status === "done") {
      setError("Cannot update case status once it is marked as done");
      return;
    }
    try {
      setIsUpdating(true);
      setError("");
      await updateCaseStatus(caseData.id, newStatus);
      setSelectedStatus(newStatus);
      onStatusUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to update case status");
      setSelectedStatus(caseData.status);
    } finally {
      setIsUpdating(false);
    }
  };

  const isAssignedDispatcher = user && caseData.dispatcherId === user.uid;
  const showAcceptButton =
    isAssignedDispatcher &&
    (caseData.status === "pending" || caseData.status === "active");
  const showStatusDropdown =
    isAssignedDispatcher &&
    caseData.status !== "pending" &&
    caseData.status !== "active" &&
    caseData.status !== "done";

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatResponseTime = (seconds) => {
    if (seconds == null || seconds < 0) return null;
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs} hr ${remainMins} min` : `${hrs} hr`;
  };

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

  const hasPinnedLocation =
    caseData.latitude != null &&
    caseData.longitude != null &&
    caseData.latitude !== 0 &&
    caseData.longitude !== 0;
  const expectedAdditionalFields =
    additionalDetailFields[caseData.incidentType] ||
    additionalDetailFields.other_emergency;
  const additionalDetails = caseData.additionalDetails || {};
  const submittedAdditionalFields = expectedAdditionalFields.filter((field) =>
    String(additionalDetails[field.key] || "").trim()
  );
  const extraAdditionalFields = Object.entries(additionalDetails)
    .filter(
      ([key, value]) =>
        String(value || "").trim() &&
        !expectedAdditionalFields.some((field) => field.key === key)
    )
    .map(([key, value]) => ({ key, label: key, value }));
  const hasAdditionalDetails =
    submittedAdditionalFields.length > 0 || extraAdditionalFields.length > 0;
  const touchdownDistanceMeters =
    hasPinnedLocation && responderLocation
      ? getDistanceMeters(responderLocation, {
          latitude: caseData.latitude,
          longitude: caseData.longitude,
        })
      : null;
  const isWithinTouchdownRadius =
    touchdownDistanceMeters != null &&
    touchdownDistanceMeters <= TOUCHDOWN_RADIUS_METERS;
  const canMarkTouchdown =
    isAssignedDispatcher &&
    !caseData.touchdownAt &&
    (caseData.status === "enroute" || caseData.status === "on_scene");
  const mapRegion =
    hasPinnedLocation && responderLocation
      ? {
          latitude: (caseData.latitude + responderLocation.latitude) / 2,
          longitude: (caseData.longitude + responderLocation.longitude) / 2,
          latitudeDelta: Math.max(
            Math.abs(caseData.latitude - responderLocation.latitude) * 1.8,
            0.01
          ),
          longitudeDelta: Math.max(
            Math.abs(caseData.longitude - responderLocation.longitude) * 1.8,
            0.01
          ),
        }
      : hasPinnedLocation
        ? {
            latitude: caseData.latitude,
            longitude: caseData.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        : null;

  React.useEffect(() => {
    if (!hasPinnedLocation) return;

    let isMounted = true;
    const loadResponderLocation = async () => {
      try {
        setLocationError("");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) setLocationError("Location permission is needed to show your position.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (isMounted) {
          setResponderLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (err) {
        if (isMounted) setLocationError("Unable to get your current location.");
      }
    };

    loadResponderLocation();
    return () => {
      isMounted = false;
    };
  }, [hasPinnedLocation, caseData.id]);

  const handleTouchdown = async (source = "manual", distanceMeters = null) => {
    if (!caseData.id || !canMarkTouchdown || isTouchdownUpdating) return;

    try {
      setIsTouchdownUpdating(true);
      setError("");
      await markCaseTouchdown(caseData.id, { source, distanceMeters });
      onStatusUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to mark touchdown");
    } finally {
      setIsTouchdownUpdating(false);
    }
  };


  const styles = useMemo(
    () =>
      StyleSheet.create({
        mapShell: {
          height: 220,
          width: "100%",
          borderRadius: radii.md,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
        map: {
          flex: 1,
        },
        detailRow: {
          backgroundColor: colors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        detailLabel: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 12,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
        },
        detailValue: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 15,
          color: colors.text,
          lineHeight: 22,
        },
        currentLocationText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: colors.info,
          marginTop: 6,
        },
        locationErrorText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: colors.warning,
          marginTop: spacing.sm,
        },
        navigationButton: {
          marginTop: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.info,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
        },
        navigationButtonText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.white,
        },
        touchdownDistanceText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: colors.textSecondary,
          marginTop: spacing.sm,
        },
        touchdownTimeText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: colors.success,
          marginTop: spacing.sm,
        },
        touchdownButton: {
          marginTop: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.success,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
        },
        touchdownButtonText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.white,
        },
        postReportButton: {
          marginTop: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.accent,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
        },
        postReportButtonText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.white,
        },
        postReportSubmittedText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: colors.success,
          marginTop: spacing.sm,
        },
        postReportInput: {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          color: colors.text,
          padding: spacing.md,
          marginBottom: spacing.sm,
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 15,
        },
        postReportNotesInput: {
          minHeight: 96,
          textAlignVertical: "top",
        },
        pendingActions: {
          gap: spacing.md,
        },
        declineButton: {
          alignSelf: "center",
          minWidth: 150,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.error,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          alignItems: "center",
        },
        declineButtonText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: colors.error,
        },
        disabledButton: {
          opacity: 0.55,
        },
        reasonModalContainer: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          justifyContent: "center",
          padding: spacing.lg,
        },
        reasonModalContent: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
        },
        reasonModalTitle: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 20,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        reasonModalDescription: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 20,
          marginBottom: spacing.md,
        },
        reasonInput: {
          minHeight: 120,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          color: colors.text,
          padding: spacing.md,
          textAlignVertical: "top",
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 15,
          lineHeight: 22,
        },
        reasonError: {
          marginTop: spacing.sm,
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 13,
          color: colors.error,
        },
        reasonActions: {
          marginTop: spacing.lg,
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: spacing.sm,
        },
        reasonCancelButton: {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        reasonCancelText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.textSecondary,
        },
        reasonSubmitButton: {
          borderRadius: radii.md,
          backgroundColor: colors.error,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        reasonSubmitText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.white,
        },
        modalContainer: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "center",
          alignItems: "center",
        },
        modalBackdrop: {
          flex: 1,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        modalContent: {
          width: "90%",
          height: "80%",
          position: "relative",
        },
        fullImage: {
          width: "100%",
          height: "80%",
          resizeMode: "contain",
        },
        closeButton: {
          position: "absolute",
          top: 40,
          right: 20,
          backgroundColor: "rgba(255,255,255,0.15)",
          width: 44,
          height: 44,
          borderRadius: 22,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        },
        picker: {
          height: Platform.OS === "ios" ? 220 : 56,
          width: "100%",
          color: colors.text,
          backgroundColor: "transparent",
        },
        pickerShell: {
          backgroundColor: colors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          height: Platform.OS === "ios" ? 140 : 60,
          justifyContent: "center",
        },
        pickerItem: {
          color: colors.text,
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 16,
        },
      }),
    [colors]
  );

  const handleOpenNavigation = async () => {
    if (!hasPinnedLocation) return;

    const destination = `${caseData.latitude},${caseData.longitude}`;
    const origin = responderLocation
      ? `&origin=${responderLocation.latitude},${responderLocation.longitude}`
      : "";
    const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${destination}&travelmode=driving`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      setError("Unable to open Google Maps.");
    }
  };

  const handleSubmitPostReport = async () => {
    if (!caseData.id) return;

    try {
      setIsSubmittingPostReport(true);
      setError("");
      const peopleInvolvedValue = postReportForm.peopleInvolved.trim();
      await submitPostIncidentReport(caseData.id, {
        reasonForIncident: postReportForm.reasonForIncident,
        notes: postReportForm.notes,
        peopleInvolved: peopleInvolvedValue ? Number(peopleInvolvedValue) : null,
        peopleStatus: postReportForm.peopleStatus,
        hospital: postReportForm.hospital,
      });
      setIsPostReportModalVisible(false);
      onStatusUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to submit post report");
    } finally {
      setIsSubmittingPostReport(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 22,
              color: colors.text,
              marginBottom: spacing.md,
              letterSpacing: -0.3,
            }}
          >
            {getIncidentTypeName(caseData.incidentType)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CaseStatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority || "medium"} />
          </View>
        </View>

        {hasPinnedLocation && (
          <Section title="Pinned Location" colors={colors}>
            <View style={styles.mapShell}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: caseData.latitude,
                    longitude: caseData.longitude,
                  }}
                  title={getIncidentTypeName(caseData.incidentType)}
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
            </View>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: spacing.md,
              }}
            >
              {caseData.locationText || "Pinned incident location"}
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 6,
              }}
            >
              {caseData.latitude.toFixed(6)}, {caseData.longitude.toFixed(6)}
            </Text>
            {responderLocation ? (
              <Text style={styles.currentLocationText}>
                Your location: {responderLocation.latitude.toFixed(6)},{" "}
                {responderLocation.longitude.toFixed(6)}
              </Text>
            ) : null}
            {locationError ? (
              <Text style={styles.locationErrorText}>{locationError}</Text>
            ) : null}
            {touchdownDistanceMeters != null && !caseData.touchdownAt ? (
              <Text style={styles.touchdownDistanceText}>
                Distance to pinned location: {touchdownDistanceMeters.toFixed(1)} m
              </Text>
            ) : null}
            {caseData.touchdownAt ? (
              <View>
                <Text style={styles.touchdownTimeText}>
                  Touchdown: {formatDate(caseData.touchdownAt)}
                </Text>
                {caseData.postIncidentReport?.submittedAt ? (
                  <Text style={styles.postReportSubmittedText}>
                    Post report sent: {formatDate(caseData.postIncidentReport.submittedAt)}
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setError("");
                      setIsPostReportModalVisible(true);
                    }}
                    activeOpacity={0.85}
                    style={styles.postReportButton}
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
                  isTouchdownUpdating && styles.disabledButton,
                ]}
              >
                <Text style={styles.touchdownButtonText}>
                  {isTouchdownUpdating ? "Marking Touchdown..." : "Touchdown"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleOpenNavigation}
              activeOpacity={0.85}
              style={styles.navigationButton}
            >
              <Text style={styles.navigationButtonText}>
                Open Google Maps Navigation
              </Text>
            </TouchableOpacity>
          </Section>
        )}

        {caseData.description && (
          <Section title="Description" colors={colors}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 15,
                color: colors.textSecondary,
                lineHeight: 22,
              }}
            >
              {caseData.description}
            </Text>
          </Section>
        )}

        {caseData.imageUrl && (
          <Section title="Photo" colors={colors}>
            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              style={{ borderRadius: radii.md, overflow: "hidden" }}
            >
              <Image
                source={{ uri: caseData.imageUrl }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: radii.md,
                }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </Section>
        )}

        <Section title="Location" colors={colors}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
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
                marginTop: 6,
              }}
            >
              Nearest landmark: {caseData.landmark}
            </Text>
          )}
          {caseData.peopleInvolved != null && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 6,
              }}
            >
              People involved: {caseData.peopleInvolved}
            </Text>
          )}
          {caseData.latitude != null && caseData.longitude != null && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 6,
              }}
            >
              {caseData.latitude.toFixed(6)}, {caseData.longitude.toFixed(6)}
            </Text>
          )}
        </Section>

        <Section title="Additional Details" colors={colors}>
          {hasAdditionalDetails ? (
            <View>
              {caseData.additionalDetailsSubmittedAt && (
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_400Regular",
                    fontSize: 12,
                    color: colors.success,
                    marginBottom: spacing.md,
                  }}
                >
                  Updated: {formatDate(caseData.additionalDetailsSubmittedAt)}
                </Text>
              )}
              {submittedAdditionalFields.map((field) => (
                <View key={field.key} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{field.label}</Text>
                  <Text style={styles.detailValue}>
                    {additionalDetails[field.key]}
                  </Text>
                </View>
              ))}
              {extraAdditionalFields.map((field) => (
                <View key={field.key} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{field.label}</Text>
                  <Text style={styles.detailValue}>{field.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
              }}
            >
              {caseData.additionalDetailsRequestedAt
                ? "Waiting for the civilian to send additional details."
                : "No additional details have been requested yet."}
            </Text>
          )}
        </Section>

        {reporterInfo && (
          <Section title="Reporter" colors={colors}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 15,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {reporterInfo.fullName || reporterInfo.name || "Not available"}
            </Text>
            {reporterInfo.phone && (
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_400Regular",
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 2,
                }}
              >
                {reporterInfo.phone}
              </Text>
            )}
            {reporterInfo.email && (
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_400Regular",
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                {reporterInfo.email}
              </Text>
            )}
          </Section>
        )}

        <Section title="Timestamps" colors={colors}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 4,
            }}
          >
            Reported: {formatDate(caseData.createdAt)}
          </Text>
          {caseData.acceptedAt && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Accepted: {formatDate(caseData.acceptedAt)}
            </Text>
          )}
          {caseData.touchdownAt && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Touchdown: {formatDate(caseData.touchdownAt)}
            </Text>
          )}
          {formatResponseTime(caseData.responseTimeSeconds) && (
            <View
              style={{
                marginTop: spacing.md,
                backgroundColor: colors.surfaceHighlight,
                borderRadius: radii.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderWidth: 1,
                borderColor: colors.success + "40",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 12,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Response Time
              </Text>
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 15,
                  color: colors.success,
                }}
              >
                {formatResponseTime(caseData.responseTimeSeconds)}
              </Text>
            </View>
          )}
          {caseData.updatedAt && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Updated: {formatDate(caseData.updatedAt)}
            </Text>
          )}
        </Section>

        {isAssignedDispatcher && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.lg,
              marginBottom: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {error && (
              <View style={{ marginBottom: spacing.md }}>
                <ErrorAlert message={error} onDismiss={() => setError("")} />
              </View>
            )}

            {showAcceptButton && (
              <View style={styles.pendingActions}>
                <CustomButton
                  title="Accept Case"
                  onPress={handleAcceptCase}
                  disabled={isUpdating}
                  variant="primary"
                />
                <TouchableOpacity
                  onPress={() => {
                    setError("");
                    setIsDeclineModalVisible(true);
                  }}
                  disabled={isUpdating}
                  style={[
                    styles.declineButton,
                    isUpdating && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.declineButtonText}>Decline Case</Text>
                </TouchableOpacity>
              </View>
            )}

            {showStatusDropdown && (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_600SemiBold",
                    fontSize: 14,
                    color: colors.text,
                    marginBottom: spacing.md,
                  }}
                >
                  Update Status
                </Text>
                <View style={styles.pickerShell}>
                  <Picker
                    selectedValue={selectedStatus}
                    onValueChange={handleStatusChange}
                    enabled={!isUpdating}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="En Route" value="enroute" />
                    <Picker.Item label="On Scene" value="on_scene" />
                    <Picker.Item label="Done" value="done" />
                  </Picker>
                </View>
              </View>
            )}

            {caseData.status === "done" && (
              <View
                style={{
                  backgroundColor: colors.surfaceHighlight,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.success + "40",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_600SemiBold",
                    fontSize: 14,
                    color: colors.success,
                  }}
                >
                  Case Completed
                </Text>
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_400Regular",
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  This case cannot be modified.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Text
                  style={{
                    fontSize: 24,
                    color: colors.white,
                    fontFamily: "SpaceGrotesk_400Regular",
                  }}
                >
                  ×
                </Text>
              </TouchableOpacity>
              <Image
                source={{ uri: caseData.imageUrl }}
                style={styles.fullImage}
                contentFit="contain"
                transition={200}
              />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={isDeclineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isUpdating) {
            setIsDeclineModalVisible(false);
          }
        }}
      >
        <View style={styles.reasonModalContainer}>
          <View style={styles.reasonModalContent}>
            <Text style={styles.reasonModalTitle}>Decline Case</Text>
            <Text style={styles.reasonModalDescription}>
              Add the reason so dispatch can reassign the case properly.
            </Text>
            <TextInput
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Reason for decline"
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!isUpdating}
              style={styles.reasonInput}
            />
            {error ? (
              <Text style={styles.reasonError}>{error}</Text>
            ) : null}
            <View style={styles.reasonActions}>
              <TouchableOpacity
                onPress={() => {
                  setIsDeclineModalVisible(false);
                  setDeclineReason("");
                  setError("");
                }}
                disabled={isUpdating}
                style={styles.reasonCancelButton}
              >
                <Text style={styles.reasonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeclineCase}
                disabled={isUpdating || !declineReason.trim()}
                style={[
                  styles.reasonSubmitButton,
                  (isUpdating || !declineReason.trim()) && styles.disabledButton,
                ]}
              >
                <Text style={styles.reasonSubmitText}>
                  {isUpdating ? "Declining..." : "Submit Decline"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPostReportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingPostReport) setIsPostReportModalVisible(false);
        }}
      >
        <View style={styles.reasonModalContainer}>
          <View style={styles.reasonModalContent}>
            <Text style={styles.reasonModalTitle}>Post Report</Text>
            <Text style={styles.reasonModalDescription}>
              Add any available details from the scene. Fields can be left blank.
            </Text>
            <TextInput
              value={postReportForm.reasonForIncident}
              onChangeText={(value) =>
                setPostReportForm((current) => ({ ...current, reasonForIncident: value }))
              }
              placeholder="Reason for incident"
              placeholderTextColor={colors.textMuted}
              editable={!isSubmittingPostReport}
              style={styles.postReportInput}
            />
            <TextInput
              value={postReportForm.notes}
              onChangeText={(value) =>
                setPostReportForm((current) => ({ ...current, notes: value }))
              }
              placeholder="Notes"
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!isSubmittingPostReport}
              style={[styles.postReportInput, styles.postReportNotesInput]}
            />
            <TextInput
              value={postReportForm.peopleInvolved}
              onChangeText={(value) =>
                setPostReportForm((current) => ({
                  ...current,
                  peopleInvolved: value.replace(/[^0-9]/g, ""),
                }))
              }
              placeholder="Number of people involved"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              editable={!isSubmittingPostReport}
              style={styles.postReportInput}
            />
            <TextInput
              value={postReportForm.peopleStatus}
              onChangeText={(value) =>
                setPostReportForm((current) => ({ ...current, peopleStatus: value }))
              }
              placeholder="Status of people involved"
              placeholderTextColor={colors.textMuted}
              editable={!isSubmittingPostReport}
              style={styles.postReportInput}
            />
            <TextInput
              value={postReportForm.hospital}
              onChangeText={(value) =>
                setPostReportForm((current) => ({ ...current, hospital: value }))
              }
              placeholder="Hospital"
              placeholderTextColor={colors.textMuted}
              editable={!isSubmittingPostReport}
              style={styles.postReportInput}
            />
            {error ? <Text style={styles.reasonError}>{error}</Text> : null}
            <View style={styles.reasonActions}>
              <TouchableOpacity
                onPress={() => {
                  setIsPostReportModalVisible(false);
                  setError("");
                }}
                disabled={isSubmittingPostReport}
                style={styles.reasonCancelButton}
              >
                <Text style={styles.reasonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitPostReport}
                disabled={isSubmittingPostReport}
                style={[
                  styles.reasonSubmitButton,
                  isSubmittingPostReport && styles.disabledButton,
                ]}
              >
                <Text style={styles.reasonSubmitText}>
                  {isSubmittingPostReport ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
