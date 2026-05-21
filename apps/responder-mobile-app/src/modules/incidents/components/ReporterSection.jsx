import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Phone, Mail } from "lucide-react-native";
import Section from "./Section";
import { radii, spacing } from "@/theme";

export default function ReporterSection({ reporterInfo, colors, handleMakeCall, handleSendEmail, embedded = false }) {
  if (!reporterInfo) return null;

  return (
    <Section title="Reporter" colors={colors} collapsible={true} defaultExpanded={false} embedded={embedded}>
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
      <View style={styles.contactRow}>
        {reporterInfo.phone && (
          <TouchableOpacity
            style={[styles.contactChip, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
            onPress={() => handleMakeCall(reporterInfo.phone)}
            activeOpacity={0.7}
            accessibilityLabel={`Call reporter at ${reporterInfo.phone}`}
            accessibilityRole="button"
          >
            <Phone size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.contactChipText, { color: colors.text }]}>{reporterInfo.phone}</Text>
          </TouchableOpacity>
        )}
        {reporterInfo.email && (
          <TouchableOpacity
            style={[styles.contactChip, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
            onPress={() => handleSendEmail(reporterInfo.email)}
            activeOpacity={0.7}
            accessibilityLabel={`Email reporter at ${reporterInfo.email}`}
            accessibilityRole="button"
          >
            <Mail size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.contactChipText, { color: colors.text }]}>{reporterInfo.email}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  contactChipText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 13,
  },
});
