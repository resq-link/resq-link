import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { toDisplayTimestamp } from "@/features/emergency/utils/incidentStatus";

function DetailRow({ label, value, colors, isLast = false }) {
  if (!value) return null;
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function IncidentDetailsCard({ report, colors }) {
  if (!report) return null;

  const submittedAt = toDisplayTimestamp(report.createdAt);
  const location = [report.locationText, report.landmark].filter(Boolean).join(" · ");

  const rows = [
    { label: "Location", value: location || "—" },
    { label: "Reported", value: submittedAt },
    { label: "Notes", value: report.description },
  ].filter((row) => row.value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>
        INCIDENT DETAILS
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        {rows.map((row, index) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={row.value}
            colors={colors}
            isLast={index === rows.length - 1 && !report.imageUrl}
          />
        ))}

        {report.imageUrl ? (
          <View style={styles.attachmentBlock}>
            <Image
              source={{ uri: report.imageUrl }}
              style={[styles.image, { borderColor: colors.border }]}
              accessibilityLabel="Incident photo attachment"
              resizeMode="cover"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default memo(IncidentDetailsCard);

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  heading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    width: 72,
    flexShrink: 0,
    paddingTop: 1,
  },
  value: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
  },
  attachmentBlock: {
    padding: 10,
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
  },
});
