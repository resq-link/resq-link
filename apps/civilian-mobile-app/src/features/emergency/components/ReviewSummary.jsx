import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight, MapPin, FileText, Image as ImageIcon } from "lucide-react-native";
import { getTypeOptionByKey } from "@/features/emergency/constants";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function SummaryCard({ label, value, onEdit, icon: Icon, styles, reportTheme }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLabelRow}>
          {Icon ? (
            <Icon size={16} color={reportTheme.primary} strokeWidth={2.2} />
          ) : null}
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
        <ChevronRight size={18} color={reportTheme.textSecondary} />
      </View>
      <Text style={styles.cardValue} numberOfLines={3}>
        {value || "—"}
      </Text>
    </Pressable>
  );
}

export default function ReviewSummary({
  incidentType,
  typeProfile,
  locationText,
  description,
  additionalNotes,
  landmark,
  peopleInvolved,
  imageUris,
  onEditStep,
}) {
  const { reportTheme } = useAppTheme();
  const typeOption = getTypeOptionByKey(incidentType, typeProfile);
  const typeLabel = typeOption?.label || "Emergency";

  const styles = useThemedStyles(
    (t) => ({
      heading: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.title,
        color: t.text,
        marginBottom: 8,
      },
      subheading: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
      },
      stack: {
        gap: 12,
      },
      card: {
        backgroundColor: t.card,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: t.border,
        shadowColor: t.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 3,
      },
      pressed: {
        opacity: 0.92,
      },
      cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      },
      cardLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      cardLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
      cardValue: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.body,
        color: t.text,
        lineHeight: 22,
      },
    }),
    reportTheme
  );

  const detailParts = [
    description?.trim(),
    additionalNotes?.trim(),
    landmark?.trim() ? `Landmark: ${landmark.trim()}` : null,
    peopleInvolved?.trim() ? `People involved: ${peopleInvolved.trim()}` : null,
  ].filter(Boolean);

  const detailsSummary = detailParts.length
    ? detailParts.join("\n")
    : "No extra details added";

  const attachmentSummary =
    imageUris.length > 0
      ? `${imageUris.length} photo${imageUris.length === 1 ? "" : "s"}`
      : "No photos attached";

  return (
    <View>
      <Text style={styles.heading}>Review report</Text>
      <Text style={styles.subheading}>
        Confirm everything looks right before sending to dispatch.
      </Text>

      <View style={styles.stack}>
        <SummaryCard
          label="Emergency"
          value={typeLabel}
          onEdit={() => onEditStep(0)}
          styles={styles}
          reportTheme={reportTheme}
        />
        <SummaryCard
          label="Location"
          value={locationText}
          onEdit={() => onEditStep(1)}
          icon={MapPin}
          styles={styles}
          reportTheme={reportTheme}
        />
        <SummaryCard
          label="Details"
          value={detailsSummary}
          onEdit={() => onEditStep(2)}
          icon={FileText}
          styles={styles}
          reportTheme={reportTheme}
        />
        <SummaryCard
          label="Attachments"
          value={attachmentSummary}
          onEdit={() => onEditStep(3)}
          icon={ImageIcon}
          styles={styles}
          reportTheme={reportTheme}
        />
      </View>
    </View>
  );
}
