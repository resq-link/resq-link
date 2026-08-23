import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  getSceneAssessmentEntries,
  hasResponderSceneAssessment,
} from "@packages/firebase";
import Section from "./Section";
import { radii, spacing } from "@/theme";

export default function SceneAssessmentSection({
  caseData,
  colors,
  formatDate,
  embedded = false,
}) {
  const assessment = caseData.responderAssessment;
  const incidentType = caseData.assessmentIncidentType || caseData.incidentType;

  if (!hasResponderSceneAssessment(assessment)) {
    return null;
  }

  const entries = getSceneAssessmentEntries(assessment, incidentType);

  return (
    <Section
      title="Scene Assessment"
      colors={colors}
      collapsible
      defaultExpanded
      embedded={embedded}
    >
      {assessment.updatedAt ? (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: colors.success,
            marginBottom: spacing.md,
          }}
        >
          Submitted {formatDate(assessment.updatedAt)}
          {assessment.updatedByName ? ` · ${assessment.updatedByName}` : ""}
        </Text>
      ) : null}
      {entries.map((entry) => (
        <View
          key={entry.key}
          style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{entry.label}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{entry.value}</Text>
        </View>
      ))}
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
});
