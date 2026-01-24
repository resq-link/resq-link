import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MapPin, Clock, AlertCircle } from "lucide-react-native";
import { acceptCase } from "@packages/firebase";
import useUserStore from "@/utils/userStore";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function CaseCard({ case: caseData, onPress, onStatusUpdate }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const { user } = useUserStore();

  // Check if the current user is the assigned dispatcher
  const isAssignedDispatcher = user && caseData.dispatcherId === user.uid;
  
  // Show Accept button if status is pending or active and user is assigned
  const showAcceptButton = isAssignedDispatcher && (caseData.status === "pending" || caseData.status === "active");

  const handleAcceptCase = async () => {
    if (!caseData.id) {
      return;
    }

    try {
      setIsAccepting(true);
      await acceptCase(caseData.id);
      // Call onStatusUpdate callback if provided to refresh the case data
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err) {
      console.error("Error accepting case:", err);
      // You could show an error alert here if needed
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: "#0f172a",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#1e293b",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 18,
              color: "#f1f5f9",
              marginBottom: 4,
            }}
          >
            {getIncidentTypeName(caseData.incidentType)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <CaseStatusBadge status={caseData.status} />
            <View style={{ width: 8 }} />
            <PriorityBadge priority={caseData.priority || "medium"} />
          </View>
        </View>
      </View>

      {caseData.description && (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 14,
            color: "#cbd5e1",
            marginBottom: 12,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {caseData.description}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <MapPin size={16} color="#94a3b8" />
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 14,
            color: "#94a3b8",
            marginLeft: 6,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {caseData.locationText || "Location not available"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: showAcceptButton ? 12 : 0 }}>
        <Clock size={16} color="#94a3b8" />
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 12,
            color: "#94a3b8",
            marginLeft: 6,
          }}
        >
          {formatDate(caseData.createdAt)}
        </Text>
      </View>

      {/* Accept Case Button */}
      {showAcceptButton && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleAcceptCase();
            }}
            disabled={isAccepting}
            activeOpacity={0.7}
          >
            <View
              style={{
                backgroundColor: isAccepting ? "#475569" : "#007AFF",
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                {isAccepting ? "Accepting..." : "Accept Case"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

