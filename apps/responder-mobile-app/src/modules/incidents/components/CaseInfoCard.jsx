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
import MapView, { Marker } from "react-native-maps";
import {
  ArrowLeft,
  Check,
  MapPin,
  MessageSquare,
  Navigation,
  Navigation2,
  Phone,
  Radio,
} from "lucide-react-native";
import {
  uploadImageToStorage,
  hasResponderSceneAssessment,
  startIncidentCallSession,
  subscribeToUserIncomingCalls,
  acceptIncidentCallSession,
  declineIncidentCallSession,
} from "@packages/firebase";
import { toast } from "@/utils/toast";
import * as Haptics from "expo-haptics";
import ResponderCallModal from "./ResponderCallModal";
import {
  acceptIncidentCase as acceptCase,
  declineIncidentCase as declineCase,
  markIncidentCaseTouchdown as markCaseTouchdown,
  submitIncidentPostReport as submitPostIncidentReport,
  submitIncidentSceneAssessment,
} from "@/services/incidentService";
import useUserStore from "@/store/userStore";

import PostReportModal from "./PostReportModal";
import SceneAssessmentModal from "./SceneAssessmentModal";
import TouchdownTimeModal from "./TouchdownTimeModal";
import SceneAssessmentSection from "./SceneAssessmentSection";
import DeclineModal from "./DeclineModal";
import CaseTimeline from "./CaseTimeline";
import Section from "./Section";
import AdditionalDetailsSection from "./AdditionalDetailsSection";
import ReporterSection from "./ReporterSection";
import CaseStatusBadge from "./CaseStatusBadge";
import PhotoPurposeBadge from "@/components/badges/PhotoPurposeBadge";
import WorkflowActionPanel from "./WorkflowActionPanel";
import { toOperationalError } from "@/utils/operationalError";
import { getPriorityColor } from "@/utils/priorityColors";
import { radii, spacing, useResqTheme } from "@/theme";
import { useRouter } from "expo-router";
import {
  canRenderNativeMap,
  getNativeMapProvider,
} from "@/utils/nativeMapConfig";

const TOUCHDOWN_RADIUS_METERS = 10;

const isValidCoordinate = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180 &&
  latitude !== 0 &&
  longitude !== 0;

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
  const router = useRouter();

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeclineModalVisible, setIsDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [responderLocation, setResponderLocation] = useState(null);
  const [streetLevelLocation, setStreetLevelLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [now, setNow] = useState(new Date());
  const [isTouchdownUpdating, setIsTouchdownUpdating] = useState(false);
  const [isTouchdownModalVisible, setIsTouchdownModalVisible] = useState(false);
  const [isPostReportModalVisible, setIsPostReportModalVisible] = useState(false);
  const [isSubmittingPostReport, setIsSubmittingPostReport] = useState(false);
  const [isSceneAssessmentModalVisible, setIsSceneAssessmentModalVisible] = useState(false);
  const [isSubmittingSceneAssessment, setIsSubmittingSceneAssessment] = useState(false);
  const [postReportForm, setPostReportForm] = useState({
    reasonForIncident: "",
    notes: "",
    peopleInvolved: "",
    peopleStatus: "",
    hospital: "",
    actionPhotoUri: "",
  });
  const [error, setError] = useState("");
  const { user } = useUserStore();

  const [activeCallSession, setActiveCallSession] = useState(null);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);

  const responderId = user?.uid || user?.id;

  // Listen for incoming calls for this responder
  useEffect(() => {
    if (!responderId) return;
    const unsub = subscribeToUserIncomingCalls(responderId, (sessions) => {
      const ringing = sessions.find(
        (s) => (s.status === "ringing" || s.status === "queued") && s.callerUserId !== responderId
      );
      if (ringing) {
        setActiveCallSession(ringing);
        setIsIncomingCall(true);
        setIsCallModalVisible(true);
      }
    });
    return () => unsub();
  }, [responderId]);

  const handleCallCivilian = async () => {
    const targetUserId = caseData?.userId || reporterInfo?.id || null;
    if (!caseData?.id) return;

    try {
      const session = await startIncidentCallSession({
        incidentId: caseData.id,
        callerUserId: responderId,
        callerRole: "responder",
        callerName: user?.displayName || user?.fullName || "Response Unit",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetUserId,
        targetRole: "civilian",
        targetName: reporterInfo?.fullName || reporterInfo?.name || "Citizen in Need",
        responderUserId: responderId,
        assignedResponderId: responderId,
        incidentReferenceNumber: caseData.referenceNumber || caseData.id,
        incidentType: caseData.incidentType,
        incidentLocationText: displayLocationText,
      });

      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("Failed to call civilian:", err);
    }
  };

  const handleCallDispatcher = async () => {
    if (!caseData?.id) return;

    try {
      const session = await startIncidentCallSession({
        incidentId: caseData.id,
        callerUserId: responderId,
        callerRole: "responder",
        callerName: user?.displayName || user?.fullName || "Response Unit",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetRole: "dispatcher",
        targetName: "Command Center Dispatch",
        responderUserId: responderId,
        assignedResponderId: responderId,
        incidentReferenceNumber: caseData.referenceNumber || caseData.id,
        incidentType: caseData.incidentType,
        incidentLocationText: displayLocationText,
      });

      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("Failed to call dispatcher:", err);
    }
  };

  const handleAnswerIncoming = async () => {
    if (activeCallSession?.id) {
      await acceptIncidentCallSession(activeCallSession.id, {
        uid: responderId,
        name: user?.displayName || user?.fullName || "Responder",
      }).catch(() => undefined);
    }
    setIsIncomingCall(false);
  };

  const handleDeclineIncoming = async () => {
    if (activeCallSession?.id) {
      await declineIncidentCallSession(activeCallSession.id, "Declined by responder").catch(() => undefined);
    }
    setIsCallModalVisible(false);
    setActiveCallSession(null);
    setIsIncomingCall(false);
  };

  const handleAcceptCase = async () => {
    if (!caseData.id) {
      setError("Incident information is unavailable.");
      return;
    }
    try {
      setIsUpdating(true);
      setError("");
      toast.message("Accepting incident…");
      await acceptCase(caseData.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Incident accepted");
      onStatusUpdate?.();
    } catch (err) {
      const message = toOperationalError(err, "Unable to accept incident");
      setError(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeclineCase = async () => {
    if (!caseData.id) {
      setError("Incident information is unavailable.");
      return;
    }
    if (!declineReason.trim()) {
      setError("Please provide a reason for declining.");
      return;
    }
    try {
      setIsUpdating(true);
      setError("");
      await declineCase(caseData.id, declineReason.trim());
      setDeclineReason("");
      setIsDeclineModalVisible(false);
      toast.success("Incident declined");
      onStatusUpdate?.();
    } catch (err) {
      const message = toOperationalError(err, "Unable to decline incident");
      setError(message);
      toast.error(message);
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

  const hasPinnedLocation = isValidCoordinate(caseData.latitude, caseData.longitude);
  const canRenderMapPreview = hasPinnedLocation && canRenderNativeMap();
  const mapProvider = getNativeMapProvider();

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
  const hasSceneAssessment = hasResponderSceneAssessment(caseData.responderAssessment);
  const sceneAssessmentInitialFields = useMemo(
    () => caseData.responderAssessment?.fields ?? {},
    [caseData.responderAssessment?.fields],
  );
  const canSubmitSceneAssessment =
    isAssignedResponder &&
    !!caseData.touchdownAt &&
    caseData.status !== "done" &&
    caseData.status !== "resolved";
  const canSubmitPostReport =
    canSubmitSceneAssessment &&
    hasSceneAssessment &&
    !caseData.postIncidentReport?.submittedAt;
  const showPostReportBlocked =
    canSubmitSceneAssessment && !hasSceneAssessment;
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

  const handleTouchdown = async (touchdownAt, onScenePhotoUri, distanceMeters = null) => {
    if (!caseData.id || !canMarkTouchdown || isTouchdownUpdating || !touchdownAt || !onScenePhotoUri?.trim()) {
      return;
    }

    let loadingId;
    try {
      setIsTouchdownUpdating(true);
      setError("");
      loadingId = toast.loading("Uploading on-scene photo…");
      const onScenePhotoUrl = await uploadImageToStorage(
        onScenePhotoUri,
        "emergencies/photos/",
        `responder-on-scene_${caseData.id}_${Date.now()}.jpg`,
      );
      toast.loading("Confirming touchdown…", { id: loadingId });
      await markCaseTouchdown(caseData.id, {
        source: "manual",
        distanceMeters,
        touchdownAt,
        onScenePhotoUrl,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("On Scene", { id: loadingId });
      setIsTouchdownModalVisible(false);
      onStatusUpdate?.();
    } catch (err) {
      const message = toOperationalError(err, "Unable to mark touchdown");
      setError(message);
      toast.error(message, loadingId ? { id: loadingId } : undefined);
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

    if (!hasResponderSceneAssessment(caseData.responderAssessment)) {
      setError("Complete the Scene Assessment before submitting the Post Report.");
      toast.message("Complete Scene Assessment first");
      return;
    }

    try {
      setIsSubmittingPostReport(true);
      setError("");
      const peopleInvolvedValue = postReportForm.peopleInvolved.trim();
      let actionPhotoUrl = null;
      if (postReportForm.actionPhotoUri?.trim()) {
        actionPhotoUrl = await uploadImageToStorage(
          postReportForm.actionPhotoUri,
          "emergencies/photos/",
          `responder-post-report_${caseData.id}_${Date.now()}.jpg`,
        );
      }
      await submitPostIncidentReport(caseData.id, {
        reasonForIncident: postReportForm.reasonForIncident,
        notes: postReportForm.notes,
        peopleInvolved: peopleInvolvedValue ? Number(peopleInvolvedValue) : null,
        peopleStatus: postReportForm.peopleStatus,
        hospital: postReportForm.hospital,
        actionPhotoUrl,
      });
      setIsPostReportModalVisible(false);
      setPostReportForm({
        reasonForIncident: "",
        notes: "",
        peopleInvolved: "",
        peopleStatus: "",
        hospital: "",
        actionPhotoUri: "",
      });
      onStatusUpdate?.();
      toast.success("Post report submitted successfully.");
    } catch (err) {
      console.error("[post-report] Submit failed:", err);
      setError("Unable to submit post report. Check your connection and try again.");
      toast.error("Unable to submit post report. Check your connection and try again.");
    } finally {
      setIsSubmittingPostReport(false);
    }
  };

  const handleSubmitSceneAssessment = async (fields) => {
    if (!caseData.id) return;

    try {
      setIsSubmittingSceneAssessment(true);
      setError("");
      const responderName =
        user?.displayName || user?.email || user?.uid || null;

      await submitIncidentSceneAssessment(caseData.id, fields, {
        updatedByName: responderName,
      });
      setIsSceneAssessmentModalVisible(false);
      toast.success("Scene Assessment submitted successfully.");
      onStatusUpdate?.();
    } catch (err) {
      console.error("[scene-assessment] Submit failed:", err);
      setError("Unable to submit scene assessment. Check your connection and try again.");
      toast.error("Unable to submit scene assessment. Check your connection and try again.");
    } finally {
      setIsSubmittingSceneAssessment(false);
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
          fontFamily: "Inter_600SemiBold",
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
        mapOverlayActions: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
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
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.text,
        },
        titleAddress: {
          fontFamily: "Inter_400Regular",
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
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          color: priorityColor,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        locationBlock: {
          marginTop: spacing.sm,
        },
        locationSubtext: {
          fontFamily: "Inter_400Regular",
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
          fontFamily: "Inter_600SemiBold",
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
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          textAlign: "center",
        },
        progressDetail: {
          fontFamily: "Inter_400Regular",
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
          fontFamily: "Inter_700Bold",
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
          fontFamily: "Inter_700Bold",
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
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          color: colors.accent,
        },
        completedSubtext: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: colors.text,
          marginTop: 2,
        },
        postReportLine: {
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
        },
        postReportLabel: {
          fontFamily: "Inter_700Bold",
          color: colors.text,
        },
        postReportMeta: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: colors.textMuted,
        },
        sheetError: {
          marginBottom: spacing.sm,
        },
        onScenePanel: {
          gap: spacing.sm,
          width: "100%",
        },
        onSceneHeader: {
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          color: colors.textMuted,
          marginBottom: 2,
        },
        onSceneStatusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          marginBottom: 2,
        },
        onSceneStatusText: {
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          color: colors.success,
        },
        disabledPostReportButton: {
          minHeight: 52,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceHighlight,
          opacity: 0.72,
        },
        disabledPostReportText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: colors.textMuted,
        },
        postReportHelperText: {
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          lineHeight: 17,
          color: colors.textMuted,
          textAlign: "center",
          paddingHorizontal: spacing.sm,
        },
        secondaryOutlineActionButton: {
          minHeight: 52,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        secondaryOutlineActionText: {
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          color: colors.text,
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
          {canRenderMapPreview ? (
            <MapView
              provider={mapProvider}
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
                title={getIncidentTypeName(caseData)}
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
              <Text style={styles.mapFallbackText}>
                {hasPinnedLocation
                  ? "Map preview is unavailable in this build."
                  : "Pinned map location is not available."}
              </Text>
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
            <View style={styles.mapOverlayActions}>
              <TouchableOpacity
                onPress={handleCallCivilian}
                style={[styles.floatingIconButton, { backgroundColor: "#10B981" }]}
                accessibilityRole="button"
                accessibilityLabel="Call citizen"
              >
                <Phone size={19} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCallDispatcher}
                style={[styles.floatingIconButton, { backgroundColor: "#0284C7" }]}
                accessibilityRole="button"
                accessibilityLabel="Call dispatch"
              >
                <Radio size={19} color="#FFFFFF" />
              </TouchableOpacity>

              {caseData.id ? (
                <TouchableOpacity
                  onPress={() => router.push(`/incident/${caseData.id}/messages`)}
                  style={styles.floatingIconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Open messages"
                >
                  <MessageSquare size={21} color={colors.info} />
                </TouchableOpacity>
              ) : null}
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
        </View>

        <View style={[styles.detailsSheet, { paddingBottom: scrollPaddingBottom }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.caseTitleRow}>
            <Text style={styles.caseTitle} numberOfLines={2}>
              {getIncidentTypeName(caseData)}
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
            {caseData.description ? (
              <Section title="Incident Summary" colors={colors} embedded={true}>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    color: colors.textSecondary,
                    lineHeight: 22,
                  }}
                >
                  {caseData.description}
                </Text>
              </Section>
            ) : null}

            {caseData.imageUrl ? (
              <Section title="Civilian Report" colors={colors} embedded={true}>
                <PhotoPurposeBadge purpose="civilian" colors={colors} />
                <TouchableOpacity
                  onPress={() => {
                    setPreviewImageUri(caseData.imageUrl);
                    setImageModalVisible(true);
                  }}
                  style={{ borderRadius: radii.md, overflow: "hidden" }}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="View civilian scene photo"
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
            ) : null}

            {hasTouchdown ? (
              <Section title="Touchdown — On-Scene Photo" colors={colors} embedded={true}>
                <PhotoPurposeBadge purpose="onScene" colors={colors} />
                {caseData.onScenePhotoUrl ? (
                  <TouchableOpacity
                    onPress={() => {
                      setPreviewImageUri(caseData.onScenePhotoUrl);
                      setImageModalVisible(true);
                    }}
                    style={{ borderRadius: radii.md, overflow: "hidden", marginTop: spacing.xs }}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="View on-scene arrival photo"
                  >
                    <Image
                      source={{ uri: caseData.onScenePhotoUrl }}
                      style={{
                        width: "100%",
                        height: 200,
                        borderRadius: radii.md,
                      }}
                      contentFit="contain"
                      transition={200}
                    />
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: colors.textMuted,
                      fontStyle: "italic",
                      marginTop: spacing.xs,
                    }}
                  >
                    No on-scene photo recorded.
                  </Text>
                )}
              </Section>
            ) : null}

            <ReporterSection
              reporterInfo={reporterInfo}
              colors={colors}
              handleMakeCall={handleMakeCall}
              handleSendEmail={handleSendEmail}
              embedded={true}
            />

            <SceneAssessmentSection
              caseData={caseData}
              colors={colors}
              formatDate={formatDate}
              embedded={true}
            />

            {hasPostReport && caseData.postIncidentReport ? (
              <Section title="Post Report — What We Did" colors={colors} embedded={true}>
                {caseData.postIncidentReport.reasonForIncident ? (
                  <Text style={styles.postReportLine}>
                    <Text style={styles.postReportLabel}>Reason: </Text>
                    {caseData.postIncidentReport.reasonForIncident}
                  </Text>
                ) : null}
                {caseData.postIncidentReport.notes ? (
                  <Text style={[styles.postReportLine, { marginTop: spacing.sm }]}>
                    <Text style={styles.postReportLabel}>Notes: </Text>
                    {caseData.postIncidentReport.notes}
                  </Text>
                ) : null}
                {caseData.postIncidentReport.peopleStatus ? (
                  <Text style={[styles.postReportLine, { marginTop: spacing.sm }]}>
                    <Text style={styles.postReportLabel}>Condition: </Text>
                    {caseData.postIncidentReport.peopleStatus}
                  </Text>
                ) : null}
                {caseData.postIncidentReport.peopleInvolved != null ? (
                  <Text style={[styles.postReportLine, { marginTop: spacing.sm }]}>
                    <Text style={styles.postReportLabel}>People involved: </Text>
                    {caseData.postIncidentReport.peopleInvolved}
                  </Text>
                ) : null}
                {caseData.postIncidentReport.hospital ? (
                  <Text style={[styles.postReportLine, { marginTop: spacing.sm }]}>
                    <Text style={styles.postReportLabel}>Transport: </Text>
                    {caseData.postIncidentReport.hospital}
                  </Text>
                ) : null}
                {caseData.postIncidentReport.submittedAt ? (
                  <Text style={[styles.postReportMeta, { marginTop: spacing.md }]}>
                    Submitted {formatDate(caseData.postIncidentReport.submittedAt)}
                    {caseData.postIncidentReport.submittedByName
                      ? ` · ${caseData.postIncidentReport.submittedByName}`
                      : ""}
                  </Text>
                ) : null}
                {[
                  { url: caseData.postIncidentReport.actionPhotoUrl, label: "Action photo" },
                  {
                    url:
                      caseData.postIncidentReport.photoUrl &&
                      caseData.postIncidentReport.photoUrl !==
                        caseData.postIncidentReport.actionPhotoUrl
                        ? caseData.postIncidentReport.photoUrl
                        : null,
                    label: "Legacy report photo",
                  },
                ]
                  .filter((photo) => photo.url)
                  .map((photo) => (
                    <View key={photo.label} style={{ marginTop: spacing.md }}>
                      <PhotoPurposeBadge purpose="action" colors={colors} />
                      <TouchableOpacity
                        onPress={() => {
                          setPreviewImageUri(photo.url);
                          setImageModalVisible(true);
                        }}
                        style={{ borderRadius: radii.md, overflow: "hidden", marginTop: spacing.xs }}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`View post-report ${photo.label.toLowerCase()}`}
                      >
                        <Image
                          source={{ uri: photo.url }}
                          style={{
                            width: "100%",
                            height: 200,
                            borderRadius: radii.md,
                          }}
                          contentFit="contain"
                          transition={200}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                {!caseData.postIncidentReport.actionPhotoUrl &&
                !(
                  caseData.postIncidentReport.photoUrl &&
                  caseData.postIncidentReport.photoUrl !==
                    caseData.postIncidentReport.actionPhotoUrl
                ) ? (
                  <Text style={[styles.postReportMeta, { marginTop: spacing.md, fontStyle: "italic" }]}>
                    No action photo submitted.
                  </Text>
                ) : null}
              </Section>
            ) : null}

            <AdditionalDetailsSection
              caseData={caseData}
              colors={colors}
              formatDate={formatDate}
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
          onRequestClose={() => {
            setImageModalVisible(false);
            setPreviewImageUri(null);
          }}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setImageModalVisible(false);
                setPreviewImageUri(null);
              }}
            >
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setImageModalVisible(false);
                    setPreviewImageUri(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close full-screen photo viewer"
                >
                  <Text
                    style={{
                      fontSize: 24,
                      color: colors.white,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
                <Image
                  source={{ uri: previewImageUri || caseData.imageUrl }}
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

        <SceneAssessmentModal
          visible={isSceneAssessmentModalVisible}
          onClose={() => {
            if (!isSubmittingSceneAssessment) {
              setIsSceneAssessmentModalVisible(false);
              setError("");
            }
          }}
          onSubmit={handleSubmitSceneAssessment}
          isSubmitting={isSubmittingSceneAssessment}
          incidentType={caseData.assessmentIncidentType || caseData.incidentType}
          initialFields={sceneAssessmentInitialFields}
          error={error}
          colors={colors}
        />

        <TouchdownTimeModal
          visible={isTouchdownModalVisible}
          onClose={() => {
            if (!isTouchdownUpdating) {
              setIsTouchdownModalVisible(false);
              setError("");
            }
          }}
          onSubmit={(touchdownAt, photoUri) =>
            handleTouchdown(touchdownAt, photoUri, touchdownDistanceMeters)
          }
          isSubmitting={isTouchdownUpdating}
          acceptedAt={acceptedTime}
          error={error}
          colors={colors}
        />
      </ScrollView>

      <WorkflowActionPanel
        colors={colors}
        resolvedScheme={resolvedScheme}
        insets={insets}
        error={error}
        onDismissError={() => setError("")}
        showAcceptButton={showAcceptButton}
        isUpdating={isUpdating}
        onAccept={handleAcceptCase}
        onDecline={() => {
          setError("");
          setIsDeclineModalVisible(true);
        }}
        canMarkTouchdown={canMarkTouchdown}
        isTouchdownUpdating={isTouchdownUpdating}
        touchdownDistanceMeters={touchdownDistanceMeters}
        onTouchdown={() => {
          setError("");
          setIsTouchdownModalVisible(true);
        }}
        canSubmitSceneAssessment={canSubmitSceneAssessment}
        canSubmitPostReport={canSubmitPostReport}
        showPostReportBlocked={showPostReportBlocked}
        hasSceneAssessment={hasSceneAssessment}
        isSubmittingSceneAssessment={isSubmittingSceneAssessment}
        isSubmittingPostReport={isSubmittingPostReport}
        onOpenSceneAssessment={() => {
          setError("");
          setIsSceneAssessmentModalVisible(true);
        }}
        onOpenPostReport={() => {
          setError("");
          setIsPostReportModalVisible(true);
        }}
        isResolved={caseData.status === "done" || caseData.status === "resolved"}
      />

      <ResponderCallModal
        visible={isCallModalVisible}
        onClose={() => {
          setIsCallModalVisible(false);
          setActiveCallSession(null);
          setIsIncomingCall(false);
        }}
        callSession={activeCallSession}
        isIncoming={isIncomingCall}
        onAnswer={handleAnswerIncoming}
        onDecline={handleDeclineIncoming}
      />
    </View>
  );
}
