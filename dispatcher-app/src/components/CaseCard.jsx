import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MapPin, Clock, AlertCircle } from "lucide-react-native";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function CaseCard({ case: caseData, onPress }) {
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
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              color: "#1C1C1E",
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
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#3A3A3C",
            marginBottom: 12,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {caseData.description}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <MapPin size={16} color="#8E8E93" />
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#8E8E93",
            marginLeft: 6,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {caseData.locationText || "Location not available"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Clock size={16} color="#8E8E93" />
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: "#8E8E93",
            marginLeft: 6,
          }}
        >
          {formatDate(caseData.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

