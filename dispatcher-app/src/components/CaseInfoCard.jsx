import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MapPin, Clock, User, AlertCircle } from "lucide-react-native";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function CaseInfoCard({ case: caseData, reporterInfo }) {
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
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: "#1C1C1E",
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
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#1C1C1E",
                marginBottom: 8,
              }}
            >
              Description
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#3A3A3C",
                lineHeight: 20,
              }}
            >
              {caseData.description}
            </Text>
          </View>
        )}

        {/* Location */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MapPin size={20} color="#007AFF" />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#1C1C1E",
                marginLeft: 8,
              }}
            >
              Location
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#3A3A3C",
              marginLeft: 28,
            }}
          >
            {caseData.locationText || "Location not available"}
          </Text>
          {caseData.latitude && caseData.longitude && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#8E8E93",
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
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <User size={20} color="#007AFF" />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: "#1C1C1E",
                  marginLeft: 8,
                }}
              >
                Reporter Information
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#3A3A3C",
                marginLeft: 28,
                marginBottom: 4,
              }}
            >
              Name: {reporterInfo.fullName || reporterInfo.name || "Not available"}
            </Text>
            {reporterInfo.phone && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "#3A3A3C",
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
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "#3A3A3C",
                  marginLeft: 28,
                }}
              >
                Email: {reporterInfo.email}
              </Text>
            )}
          </View>
        )}

        {/* Timestamps */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Clock size={20} color="#007AFF" />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#1C1C1E",
                marginLeft: 8,
              }}
            >
              Timestamps
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#3A3A3C",
              marginLeft: 28,
              marginBottom: 4,
            }}
          >
            Reported: {formatDate(caseData.createdAt)}
          </Text>
          {caseData.updatedAt && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#3A3A3C",
                marginLeft: 28,
              }}
            >
              Last Updated: {formatDate(caseData.updatedAt)}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

