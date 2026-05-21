import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  ArrowLeft,
  Check,
  MapPin,
  Navigation,
  Navigation2,
} from "lucide-react-native";
import {
  acceptIncidentCase as acceptCase,
  declineIncidentCase as declineCase,
  markIncidentCaseTouchdown as markCaseTouchdown,
  submitIncidentPostReport as submitPostIncidentReport,
} from "@/services/incidentService";
import useUserStore from "@/store/userStore";

import PostReportModal from "./PostReportModal";
import DeclineModal from "./DeclineModal";
import CaseTimeline from "./CaseTimeline";
import Section from "./Section";
import AdditionalDetailsSection from "./AdditionalDetailsSection";
import ReporterSection from "./ReporterSection";
import CaseStatusBadge from "./CaseStatusBadge";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { radii, spacing, useResqTheme } from "@/theme";

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

const getPriorityLabel = (priority) => {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
};

const getPriorityColor = (priority, colors) => {
  switch (priority?.toLowerCase()) {
    case "critical":
      return colors.priorityCritical;
    case "high":
      return colors.priorityHigh;
    case "medium":
      return colors.priorityMedium;
    case "low":
      return colors.priorityLow;
    default:
      return colors.priorityMedium;
  }
};

const formatStreetLevelAddress = (address) => {
  if (!address) return null;

  const streetParts = [
    address.name,
    address.streetNumber,
    address.street,
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean);
  const streetLine = [...new Set(streetParts)]
    .join(" ")
    .trim();

  const parts = [
    streetLine || null,
    address.district,
    address.subregion,
    address.city,
  ].filter(Boolean);

  const uniqueParts = [...new Set(parts)];
  return uniqueParts.length > 0 ? uniqueParts.join(", ") : null;
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

export default function CaseInfoCard({
  case: caseData,
  reporterInfo,
  onStatusUpdate,
  onBackPress,
}) {
  const { colors, resolvedScheme } = useResqTheme();
  const insets = useSafeAreaInsets();

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeclineModalVisible, setIsDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [responderLocation, setResponderLocation] = useState(null);
  const [streetLevelLocation, setStreetLevelLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [now, setNow] = useState(new Date());
  const [isTouchdownUpdating, setIsTouchdownUpdating] = useState(false);
  const [isPostReportModalVisible, setIsPostReportModalVisible] = useState(false);
  const [isSubmittingPostReport, setIsSubmittingPostReport] = useState(false);
  const [postReportForm, setPostReportForm] = useState({
    reasonForIncident: "",
    notes: "",
    peopleInvolved: "",
    peopleStatus: "",
    hospital: "",
  });
  const [error, setError] = useState("");
  const { user } = useUserStore();

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

  const isAssignedResponder =
    user && caseData.assignedResourceIds && caseData.assignedResourceIds.includes(user.uid);
  const showAcceptButton =
    isAssignedResponder &&
    (caseData.status === "pending" ||
      caseData.status === "dispatched" ||
      caseData.status === "awaiting_resources" ||
      caseData.status === "active");
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

  const hasPinnedLocation =
    caseData.latitude != null &&
    caseData.longitude != null &&
    caseData.latitude !== 0 &&
    caseData.longitude !== 0;

  const touchdownDistanceMeters =
    hasPinnedLocation && responderLocation
      ? getDistanceMeters(responderLocation, {
          latitude: caseData.latitude,
          longitude: caseData.longitude,
        })
      : null;

  const canMarkTouchdown =
    isAssignedResponder &&
    !caseData.touchdownAt &&
    (caseData.status === "enroute" || caseData.status === "on_scene");
  const canSubmitPostReport =
    isAssignedResponder &&
    !!caseData.touchdownAt &&
    !caseData.postIncidentReport?.submittedAt &&
    caseData.status !== "done" &&
    caseData.status !== "resolved";
  const displayLocationText = streetLevelLocation || caseData.locationText;
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
  const priorityColor = getPriorityColor(caseData.priority, colors);

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

  useEffect(() => {
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

  useEffect(() => {
    if (!hasPinnedLocation) {
      setStreetLevelLocation("");
      return;
    }

    let isMounted = true;
    const loadStreetLevelLocation = async () => {
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: caseData.latitude,
          longitude: caseData.longitude,
        });
        const streetAddress = formatStreetLevelAddress(addresses[0]);
        if (isMounted) {
          setStreetLevelLocation(streetAddress || "");
        }
      } catch {
        if (isMounted) {
          setStreetLevelLocation("");
        }
      }
    };

    loadStreetLevelLocation();
    return () => {
      isMounted = false;
    };
  }, [hasPinnedLocation, caseData.id, caseData.latitude, caseData.longitude]);

  useEffect(() => {
    if (!enRouteActive) return undefined;

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [enRouteActive]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        mapStage: {
          height: Math.max(360, insets.top + 330),
          backgroundColor: colors.surface,
        },
        map: {
          flex: 1,
        },
        mapFallback: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceHighlight,
          paddingHorizontal: spacing.xl,
        },
        mapFallbackText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
        },
        mapOverlayTop: {
          position: "absolute",
          top: insets.top + spacing.sm,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        floatingIconButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 6,
        },
        detailsSheet: {
          marginTop: -34,
          marginHorizontal: 0,
          padding: spacing.lg,
          paddingBottom: spacing.md,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: colors.background,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 12,
        },
        sheetHandle: {
          alignSelf: "center",
          width: 44,
          height: 5,
          borderRadius: 99,
          backgroundColor: colors.border,
          marginBottom: spacing.md,
        },
        caseTitleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: spacing.md,
        },
        caseTitle: {
          flex: 1,
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 24,
          color: colors.text,
        },
        titleAddress: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
          marginTop: 6,
        },
        badgeRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: spacing.md,
        },
        priorityBadge: {
          backgroundColor: priorityColor + "18",
          borderColor: priorityColor + "45",
          borderWidth: 1,
          borderRadius: radii.sm,
          paddingVertical: 5,
          paddingHorizontal: 10,
        },
        priorityBadgeText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 11,
          color: priorityColor,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        locationBlock: {
          marginTop: spacing.sm,
        },
        locationSubtext: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 5,
          lineHeight: 18,
        },
        peoplePill: {
          alignSelf: "flex-start",
          backgroundColor: colors.surfaceHighlight,
          borderRadius: radii.sm,
          paddingVertical: 4,
          paddingHorizontal: 9,
          marginTop: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
        peoplePillText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 12,
          color: colors.textSecondary,
        },
        progressShell: {
          marginTop: spacing.md,
          paddingVertical: spacing.md,
          flexDirection: "row",
          position: "relative",
          borderTopWidth: 1,
          borderTopColor: colors.border,
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
          backgroundColor: colors.border,
        },
        progressLineFill: {
          height: 2,
          backgroundColor: colors.accent,
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
        actionPanel: {
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          bottom: Math.max(insets.bottom, spacing.md),
          zIndex: 30,
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        },
        primaryActionButton: {
          flex: 1,
          minHeight: 52,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 16,
        },
        primaryActionText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 15,
          color: "#FFFFFF",
        },
        secondaryActionButton: {
          minHeight: 52,
          minWidth: 96,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.error + "45",
          backgroundColor: colors.background,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 12,
        },
        secondaryActionText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 14,
          color: colors.error,
        },
        actionIcon: {
          marginRight: spacing.sm,
        },
        actionDisabled: {
          opacity: 0.55,
        },
        completedPanel: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.accent + "88",
          backgroundColor: resolvedScheme === "dark" ? "rgba(26, 143, 104, 0.78)" : "rgba(240, 253, 250, 0.94)",
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 58,
          overflow: "hidden",
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 18,
          elevation: 14,
        },
        completedText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 15,
          color: colors.accent,
        },
        completedSubtext: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 12,
          color: colors.text,
          marginTop: 2,
        },
        sheetError: {
          marginBottom: spacing.sm,
        },
        contentStack: {
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }),
    [colors, insets.top, priorityColor, resolvedScheme]
  );

  const bottomPadding = Math.max(insets.bottom, spacing.md);
  const scrollPaddingBottom = bottomPadding + 76;
  const progressSteps = [
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
  ];

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.mapStage}>
          {hasPinnedLocation ? (
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
                title={getIncidentTypeName(caseData.incidentType)}
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
          ) : (
            <View style={styles.mapFallback}>
              <MapPin size={28} color={colors.textMuted} />
              <Text style={styles.mapFallbackText}>Pinned map location is not available.</Text>
            </View>
          )}

          <View style={styles.mapOverlayTop}>
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.floatingIconButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>
            {hasPinnedLocation ? (
              <TouchableOpacity
                onPress={handleOpenNavigation}
                style={styles.floatingIconButton}
                accessibilityRole="button"
                accessibilityLabel="Open Google Maps navigation"
              >
                <Navigation2 size={21} color={colors.info} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={[styles.detailsSheet, { paddingBottom: scrollPaddingBottom }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.caseTitleRow}>
            <Text style={styles.caseTitle} numberOfLines={2}>
              {getIncidentTypeName(caseData.incidentType)}
            </Text>
            <MapPin size={24} color={colors.info} />
          </View>
          <Text style={styles.titleAddress} numberOfLines={2}>
            {displayLocationText || "Location not available"}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>{getPriorityLabel(caseData.priority)}</Text>
            </View>
            <CaseStatusBadge status={caseData.status} />
          </View>

          <View style={styles.locationBlock}>
            {caseData.landmark ? (
              <Text style={styles.locationSubtext}>Nearest landmark: {caseData.landmark}</Text>
            ) : null}
            {locationError ? (
              <Text style={[styles.locationSubtext, { color: colors.warning }]}>{locationError}</Text>
            ) : null}
            {touchdownDistanceMeters != null && !caseData.touchdownAt ? (
              <Text style={styles.locationSubtext}>
                Distance to pinned location: {touchdownDistanceMeters.toFixed(1)} m
              </Text>
            ) : null}
            {caseData.peopleInvolved != null ? (
              <View style={styles.peoplePill}>
                <Text style={styles.peoplePillText}>People involved: {caseData.peopleInvolved}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.progressShell}>
            <View style={styles.progressLineWrap} pointerEvents="none">
              <View style={styles.progressLine} />
              <View
                style={[
                  styles.progressLineFill,
                  { width: touchdownComplete ? "100%" : acceptedTime ? "50%" : "0%" },
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

          <View style={styles.contentStack}>
            {caseData.description && (
              <Section title="Description" colors={colors} embedded={true}>
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
              <Section title="Photo" colors={colors} embedded={true}>
                <TouchableOpacity
                  onPress={() => setImageModalVisible(true)}
                  style={{ borderRadius: radii.md, overflow: "hidden" }}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="View full-size incident photo"
                  accessibilityHint="Double tap to open full-screen image viewer"
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
                    accessibilityLabel="Incident photo uploaded by civilian"
                  />
                </TouchableOpacity>
              </Section>
            )}

            <AdditionalDetailsSection
              caseData={caseData}
              colors={colors}
              formatDate={formatDate}
              embedded={true}
            />

            <ReporterSection
              reporterInfo={reporterInfo}
              colors={colors}
              handleMakeCall={handleMakeCall}
              handleSendEmail={handleSendEmail}
              embedded={true}
            />

            <Section title="Timeline" colors={colors} collapsible={true} defaultExpanded={false} embedded={true}>
              <CaseTimeline
                caseData={caseData}
                colors={colors}
                formatDate={formatDate}
                formatResponseTime={formatResponseTime}
              />
            </Section>
          </View>

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
                  accessibilityRole="button"
                  accessibilityLabel="Close full-screen photo viewer"
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

      <View style={styles.actionPanel}>
        {error ? (
          <View style={styles.sheetError}>
            <ErrorAlert message={error} onDismiss={() => setError("")} />
          </View>
        ) : null}

        {showAcceptButton ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleAcceptCase}
              disabled={isUpdating}
              activeOpacity={0.85}
              style={[
                styles.primaryActionButton,
                { backgroundColor: colors.accent },
                isUpdating && styles.actionDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Accept this emergency case"
            >
              <Check size={19} color="#FFFFFF" style={styles.actionIcon} />
              <Text style={styles.primaryActionText}>
                {isUpdating ? "Accepting..." : "Accept Case"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setError("");
                setIsDeclineModalVisible(true);
              }}
              disabled={isUpdating}
              activeOpacity={0.85}
              style={[styles.secondaryActionButton, isUpdating && styles.actionDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Decline this emergency case"
            >
              <Text style={styles.secondaryActionText}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : canMarkTouchdown ? (
          <TouchableOpacity
            onPress={() => handleTouchdown("manual", touchdownDistanceMeters)}
            disabled={isTouchdownUpdating}
            activeOpacity={0.85}
            style={[
              styles.primaryActionButton,
              { backgroundColor: colors.accent },
              isTouchdownUpdating && styles.actionDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mark arrival at scene - Touchdown"
          >
            <Navigation size={20} color="#FFFFFF" style={styles.actionIcon} />
            <Text style={styles.primaryActionText}>
              {isTouchdownUpdating ? "Marking Touchdown..." : "Touchdown"}
            </Text>
          </TouchableOpacity>
        ) : canSubmitPostReport ? (
          <TouchableOpacity
            onPress={() => {
              setError("");
              setIsPostReportModalVisible(true);
            }}
            disabled={isSubmittingPostReport}
            activeOpacity={0.85}
            style={[
              styles.primaryActionButton,
              { backgroundColor: colors.accent },
              isSubmittingPostReport && styles.actionDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit post incident report"
          >
            <Check size={19} color="#FFFFFF" style={styles.actionIcon} />
            <Text style={styles.primaryActionText}>
              {isSubmittingPostReport ? "Submitting..." : "Post Report"}
            </Text>
          </TouchableOpacity>
        ) : caseData.status === "done" || caseData.status === "resolved" ? (
          <BlurView
            intensity={80}
            tint={resolvedScheme === "dark" ? "dark" : "light"}
            style={styles.completedPanel}
          >
            <Check size={20} color={colors.accent} style={styles.actionIcon} />
            <View>
              <Text style={styles.completedText}>Case Completed</Text>
              <Text style={styles.completedSubtext}>This case is finalized.</Text>
            </View>
          </BlurView>
        ) : null}
      </View>

    </View>
  );
}
