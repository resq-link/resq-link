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
  Animated,
  LayoutAnimation,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import {
  acceptIncidentCase as acceptCase,
  declineIncidentCase as declineCase,
  markIncidentCaseTouchdown as markCaseTouchdown,
  submitIncidentPostReport as submitPostIncidentReport,
  updateIncidentStatus as updateCaseStatus,
} from "@/services/incidentService";
import useUserStore from "@/store/userStore";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import CustomButton from "@/components/ui/CustomButton";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import StickyActionBar from "./StickyActionBar";
import PostReportModal from "./PostReportModal";
import DeclineModal from "./DeclineModal";
import CaseTimeline from "./CaseTimeline";
import { Phone, Mail, Navigation2, ChevronDown } from "lucide-react-native";
import { radii, spacing, useResqTheme } from "@/theme";

const Section = ({ title, children, colors, collapsible = false, defaultExpanded = true }) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const animatedValue = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextValue = !expanded;
    setExpanded(nextValue);
    Animated.timing(animatedValue, {
      toValue: nextValue ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotateChevron = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  if (collapsible) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: expanded ? spacing.md : 0,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 14,
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {title}
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Animated.View>
        </TouchableOpacity>
        {expanded && <View style={{ marginTop: spacing.sm }}>{children}</View>}
      </View>
    );
  }

  return (
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
};

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
  const insets = useSafeAreaInsets();

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

  const isAssignedResponder =
    user && caseData.assignedResourceIds && caseData.assignedResourceIds.includes(user.uid);
  const showAcceptButton =
    isAssignedResponder &&
    (caseData.status === "pending" ||
      caseData.status === "dispatched" ||
      caseData.status === "awaiting_resources" ||
      caseData.status === "active");
  const showStatusDropdown =
    isAssignedResponder &&
    caseData.status !== "pending" &&
    caseData.status !== "dispatched" &&
    caseData.status !== "awaiting_resources" &&
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

  const handleMakeCall = async (phoneNumber) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, "");
    const url = `tel:${cleanPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setError("Your device does not support phone calls");
      }
    } catch (err) {
      setError("Failed to open dialer");
    }
  };

  const handleSendEmail = async (emailAddress) => {
    if (!emailAddress) return;
    const url = `mailto:${emailAddress}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setError("Your device does not support sending emails");
      }
    } catch (err) {
      setError("Failed to open email client");
    }
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
    additionalDetailFields[caseData.incidentCategory] ||
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
    isAssignedResponder &&
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
        contactRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: spacing.sm,
        },
        contactChip: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceHighlight,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
        contactChipText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: colors.text,
        },
        mapShell: {
          height: 280,
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
        mapFab: {
          position: "absolute",
          bottom: spacing.md,
          right: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.info,
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

  const bottomPadding = Math.max(insets.bottom, spacing.md);
  const scrollPaddingBottom = showAcceptButton
    ? bottomPadding + 85
    : showStatusDropdown || canMarkTouchdown
      ? bottomPadding + 145
      : caseData.status === "done"
        ? bottomPadding + 95
        : bottomPadding + spacing.lg;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
        <View style={{ padding: spacing.lg, paddingBottom: scrollPaddingBottom }}>
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
            {getIncidentTypeName(caseData.incidentCategory)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CaseStatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority || "medium"} />
          </View>
        </View>

        <Section title="Location & Map" colors={colors}>
          {hasPinnedLocation && (
            <View style={styles.mapShell}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
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
                style={styles.mapFab}
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
          </View>
        </Section>

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

        <Section title="Additional Details" colors={colors} collapsible={true} defaultExpanded={false}>
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
          <Section title="Reporter" colors={colors} collapsible={true} defaultExpanded={false}>
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
            <View style={styles.contactRow}>
              {reporterInfo.phone && (
                <TouchableOpacity
                  style={styles.contactChip}
                  onPress={() => handleMakeCall(reporterInfo.phone)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Call reporter at ${reporterInfo.phone}`}
                  accessibilityRole="button"
                >
                  <Phone size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.contactChipText}>{reporterInfo.phone}</Text>
                </TouchableOpacity>
              )}
              {reporterInfo.email && (
                <TouchableOpacity
                  style={styles.contactChip}
                  onPress={() => handleSendEmail(reporterInfo.email)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Email reporter at ${reporterInfo.email}`}
                  accessibilityRole="button"
                >
                  <Mail size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.contactChipText}>{reporterInfo.email}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Section>
        )}

        <Section title="Timeline" colors={colors} collapsible={true} defaultExpanded={false}>
          <CaseTimeline
            caseData={caseData}
            colors={colors}
            formatDate={formatDate}
            formatResponseTime={formatResponseTime}
          />
        </Section>


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

      <DeclineModal
        visible={isDeclineModalVisible}
        onClose={() => {
          setIsDeclineModalVisible(false);
          setDeclineReason("");
          setError("");
        }}
        onSubmit={handleDeclineCase}
        isSubmitting={isUpdating}
        reason={declineReason}
        setReason={setDeclineReason}
        error={error}
        colors={colors}
      />

      <PostReportModal
        visible={isPostReportModalVisible}
        onClose={() => {
          setIsPostReportModalVisible(false);
          setError("");
        }}
        onSubmit={handleSubmitPostReport}
        isSubmitting={isSubmittingPostReport}
        form={postReportForm}
        setForm={setPostReportForm}
        error={error}
        colors={colors}
      />
      </ScrollView>

      <StickyActionBar
        caseData={caseData}
        onAcceptCase={handleAcceptCase}
        onDeclinePress={() => {
          setError("");
          setIsDeclineModalVisible(true);
        }}
        onStatusChange={handleStatusChange}
        selectedStatus={selectedStatus}
        isUpdating={isUpdating}
        showAcceptButton={showAcceptButton}
        showStatusDropdown={showStatusDropdown}
        canMarkTouchdown={canMarkTouchdown}
        isTouchdownUpdating={isTouchdownUpdating}
        handleTouchdown={handleTouchdown}
        touchdownDistanceMeters={touchdownDistanceMeters}
        error={error}
        setError={setError}
      />
    </View>
  );
}
