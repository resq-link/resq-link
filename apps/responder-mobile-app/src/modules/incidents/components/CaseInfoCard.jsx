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
import {
  acceptIncidentCase as acceptCase,
  declineIncidentCase as declineCase,
  markIncidentCaseTouchdown as markCaseTouchdown,
  submitIncidentPostReport as submitPostIncidentReport,
  updateIncidentStatus as updateCaseStatus,
} from "@/services/incidentService";
import useUserStore from "@/store/userStore";

import StickyActionBar from "./StickyActionBar";
import PostReportModal from "./PostReportModal";
import DeclineModal from "./DeclineModal";
import CaseTimeline from "./CaseTimeline";
import Section from "./Section";
import CaseMapSection from "./CaseMapSection";
import AdditionalDetailsSection from "./AdditionalDetailsSection";
import ReporterSection from "./ReporterSection";
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

export default function CaseInfoCard({
  case: caseData,
  reporterInfo,
  onStatusUpdate,
}) {
  const { colors } = useResqTheme();
  const insets = useSafeAreaInsets();

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(caseData.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeclineModalVisible, setIsDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [responderLocation, setResponderLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
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

  useEffect(() => {
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
      }),
    [colors]
  );

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
          <CaseMapSection
            caseData={caseData}
            hasPinnedLocation={hasPinnedLocation}
            responderLocation={responderLocation}
            locationError={locationError}
            mapRegion={mapRegion}
            touchdownDistanceMeters={touchdownDistanceMeters}
            canMarkTouchdown={canMarkTouchdown}
            isTouchdownUpdating={isTouchdownUpdating}
            handleTouchdown={handleTouchdown}
            handleOpenNavigation={handleOpenNavigation}
            formatDate={formatDate}
            setIsPostReportModalVisible={setIsPostReportModalVisible}
            setError={setError}
            colors={colors}
          />

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
          />

          <ReporterSection
            reporterInfo={reporterInfo}
            colors={colors}
            handleMakeCall={handleMakeCall}
            handleSendEmail={handleSendEmail}
          />

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
