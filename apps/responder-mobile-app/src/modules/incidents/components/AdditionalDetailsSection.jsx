import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Section from "./Section";
import { radii, spacing } from "@/theme";

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

export default function AdditionalDetailsSection({ caseData, colors, formatDate, embedded = false }) {
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

  return (
    <Section title="Additional Details" colors={colors} collapsible={true} defaultExpanded={false} embedded={embedded}>
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
            <View key={field.key} style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{field.label}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {additionalDetails[field.key]}
              </Text>
            </View>
          ))}
          {extraAdditionalFields.map((field) => (
            <View key={field.key} style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{field.label}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{field.value}</Text>
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
  );
}

const styles = StyleSheet.create({
  detailRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailValue: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
});
