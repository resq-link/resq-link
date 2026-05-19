import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import useUserStore from "@/store/userStore";
import { acceptIncidentCase } from "@/services/incidentService";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import { radii, spacing, useResqTheme } from "@/theme";

export default function CaseCard({ case: caseData, onPress, onStatusUpdate }) {
  const { colors } = useResqTheme();
  const [isAccepting, setIsAccepting] = useState(false);
  const { user } = useUserStore();

  const isAssignedResponder =
    user && caseData.assignedResourceIds && caseData.assignedResourceIds.includes(user.uid);
  const showAcceptButton =
    isAssignedResponder &&
    (caseData.status === "pending" ||
      caseData.status === "dispatched" ||
      caseData.status === "awaiting_resources" ||
      caseData.status === "active");

  const handleAcceptCase = async () => {
    if (!caseData.id) return;
    try {
      setIsAccepting(true);
      const updatedCase = await acceptIncidentCase(caseData.id);
      onStatusUpdate?.(caseData.id, updatedCase.status || "enroute");
    } catch (err) {
      console.error("Error accepting case:", err);
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
      vehicular_accident: "Vehicular Accident",
      police_emergency: "Police Emergency",
      electrical_powerline_hazard: "Electrical / Powerline Hazard",
      other_emergency: "Other Emergency",
    };
    return typeMap[type] || "Emergency";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 17,
              color: colors.text,
              marginBottom: 6,
              letterSpacing: 0.2,
            }}
          >
            {getIncidentTypeName(caseData.incidentType)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CaseStatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority || "medium"} />
          </View>
        </View>
      </View>

      {caseData.description && (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: spacing.md,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {caseData.description}
        </Text>
      )}

      <View
        style={{
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 13,
            color: colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {caseData.locationText || "Location not available"}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: colors.textMuted,
        }}
      >
        {formatDate(caseData.createdAt)}
      </Text>

      {showAcceptButton && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleAcceptCase();
          }}
          disabled={isAccepting}
          activeOpacity={0.85}
          style={{
            marginTop: spacing.lg,
            backgroundColor: isAccepting ? colors.disabled : colors.accent,
            borderRadius: radii.md,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 15,
              color: colors.white,
            }}
          >
            {isAccepting ? "Accepting..." : "Accept Case"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
