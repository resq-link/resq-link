import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { MapPin, Clock, User, AlertCircle, X } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { acceptCase, updateCaseStatus } from "@packages/firebase";
import useUserStore from "@/utils/userStore";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import CustomButton from "./CustomButton";
import ErrorAlert from "./ErrorAlert";

export default function CaseInfoCard({ case: caseData, reporterInfo, onStatusUpdate }) {
  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState(caseData.status);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState("");
  const { user } = useUserStore();

  // Update selectedStatus when caseData.status changes
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
      // Call onStatusUpdate callback if provided to refresh the case data
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err) {
      console.error("Error accepting case:", err);
      setError(err.message || "Failed to accept case");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!caseData.id) {
      setError("Case ID is missing");
      return;
    }

    // Don't update if status hasn't changed
    if (newStatus === caseData.status) {
      return;
    }

    // Don't allow changing from done
    if (caseData.status === "done") {
      setError("Cannot update case status once it is marked as done");
      return;
    }

    try {
      setIsUpdating(true);
      setError("");
      await updateCaseStatus(caseData.id, newStatus);
      setSelectedStatus(newStatus);
      // Call onStatusUpdate callback if provided to refresh the case data
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err) {
      console.error("Error updating case status:", err);
      setError(err.message || "Failed to update case status");
      // Revert the picker selection on error
      setSelectedStatus(caseData.status);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if the current user is the assigned dispatcher
  const isAssignedDispatcher = user && caseData.dispatcherId === user.uid;
  
  // Show Accept button if status is pending or active and user is assigned
  const showAcceptButton = isAssignedDispatcher && (caseData.status === "pending" || caseData.status === "active");
  
  // Show status dropdown if case is accepted (not pending/active) and not done
  const showStatusDropdown = isAssignedDispatcher && 
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
      crime: "Crime",
      accident: "Traffic Accident",
      flood: "Flood",
      other: "Other Emergency",
    };
    return typeMap[type] || "Emergency";
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 24,
              color: "#f1f5f9",
              marginBottom: 12,
            }}
          >
            {getIncidentTypeName(caseData.incidentType)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <CaseStatusBadge status={caseData.status} />
            <View style={{ width: 8 }} />
            <PriorityBadge priority={caseData.priority || "medium"} />
          </View>
        </View>

        {/* Description */}
        {caseData.description && (
          <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 16,
                color: "#f1f5f9",
                marginBottom: 8,
              }}
            >
              Description
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: "#cbd5e1",
                lineHeight: 20,
              }}
            >
              {caseData.description}
            </Text>
          </View>
        )}

        {/* Photo */}
        {caseData.imageUrl && (
          <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 16,
                color: "#f1f5f9",
                marginBottom: 12,
              }}
            >
              Photo
            </Text>
            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              style={{
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: caseData.imageUrl }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 8,
                }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Location */}
        <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 16,
              color: "#f1f5f9",
              marginBottom: 12,
            }}
          >
            Location
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 14,
              color: "#cbd5e1",
              marginLeft: 28,
            }}
          >
            {caseData.locationText || "Location not available"}
          </Text>
          {caseData.latitude && caseData.longitude && (
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: "#94a3b8",
                marginLeft: 28,
                marginTop: 4,
              }}
            >
              Coordinates: {caseData.latitude.toFixed(6)}, {caseData.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Reporter Information */}
        {reporterInfo && (
          <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 16,
                color: "#f1f5f9",
                marginBottom: 12,
              }}
            >
              Reporter Information
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: "#cbd5e1",
                marginLeft: 28,
                marginBottom: 4,
              }}
            >
              Name: {reporterInfo.fullName || reporterInfo.name || "Not available"}
            </Text>
            {reporterInfo.phone && (
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_400Regular",
                  fontSize: 14,
                  color: "#cbd5e1",
                  marginLeft: 28,
                  marginBottom: 4,
                }}
              >
                Phone: {reporterInfo.phone}
              </Text>
            )}
            {reporterInfo.email && (
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_400Regular",
                  fontSize: 14,
                  color: "#cbd5e1",
                  marginLeft: 28,
                }}
              >
                Email: {reporterInfo.email}
              </Text>
            )}
          </View>
        )}

        {/* Timestamps */}
        <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Clock size={20} color="#f1f5f9" />
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 16,
                color: "#f1f5f9",
                marginLeft: 8,
              }}
            >
              Timestamps
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 14,
              color: "#cbd5e1",
              marginLeft: 28,
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
                color: "#cbd5e1",
                marginLeft: 28,
              }}
            >
              Last Updated: {formatDate(caseData.updatedAt)}
            </Text>
          )}
        </View>

        {/* Case Actions - Accept Button and Status Dropdown */}
        {isAssignedDispatcher && (
          <View style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
            {error && (
              <View style={{ marginBottom: 12 }}>
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
              <View style={{ marginTop: 2, marginBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_600SemiBold",
                    fontSize: 16,
                    color: "#f1f5f9",
                    marginBottom: 16,
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
                  backgroundColor: "#2f4054",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_600SemiBold",
                    fontSize: 14,
                    color: "#34C759",
                  }}
                >
                  Case Completed
                </Text>
                <Text
                  style={{
                    fontFamily: "SpaceGrotesk_400Regular",
                    fontSize: 12,
                    color: "#34C759",
                    marginTop: 4,
                  }}
                >
                  This case has been marked as done and cannot be modified.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
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
                <X size={24} color="#FFFFFF" />
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
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  picker: {
    height: Platform.OS === "ios" ? 220 : 56,
    width: "100%",
    color: "#f1f5f9",
    backgroundColor: "transparent",
  },
  pickerShell: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
    height: Platform.OS === "ios" ? 140 : 60,
    justifyContent: "center",
  },
  pickerItem: {
    color: "#f1f5f9",
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
  },
});
