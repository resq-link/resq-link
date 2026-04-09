import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Picker } from "@react-native-picker/picker";
import { acceptCase, updateCaseStatus } from "@packages/firebase";
import useUserStore from "@/utils/userStore";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import CustomButton from "./CustomButton";
import ErrorAlert from "./ErrorAlert";
import { colors, radii, spacing } from "@/theme";

const Section = ({ title, children }) => (
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

export default function CaseInfoCard({
  case: caseData,
  reporterInfo,
  onStatusUpdate,
}) {
  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState(caseData.status);
  const [isUpdating, setIsUpdating] = React.useState(false);
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

        {caseData.description && (
          <Section title="Description">
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
          <Section title="Photo">
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

        <Section title="Location">
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

        {reporterInfo && (
          <Section title="Reporter">
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

        <Section title="Timestamps">
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
          {caseData.updatedAt && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
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
              <CustomButton
                title="Accept Case"
                onPress={handleAcceptCase}
                disabled={isUpdating}
                variant="primary"
              />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
