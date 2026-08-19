import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { TYPE_SPECIFIC_FIELDS } from "@/features/emergency/constants";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function Field({ label, placeholder, value, onChangeText, keyboardType, styles, reportTheme }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={reportTheme.textSecondary}
        keyboardType={keyboardType || "default"}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function DetailsSection({
  typeProfile,
  description,
  onChangeDescription,
  landmark,
  onChangeLandmark,
  peopleInvolved,
  onChangePeopleInvolved,
  additionalNotes,
  onChangeAdditionalNotes,
  extraDetails,
  onChangeExtraDetail,
  showAdvanced,
  onToggleAdvanced,
}) {
  const { reportTheme } = useAppTheme();
  const profileFields = TYPE_SPECIFIC_FIELDS[typeProfile] || [];

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
      field: {
        marginBottom: 14,
      },
      fieldLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption + 1,
        color: t.textSecondary,
        marginBottom: 8,
      },
      input: {
        minHeight: 52,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.text,
      },
      textArea: {
        minHeight: 110,
        marginTop: 4,
      },
      smartSection: {
        marginTop: 8,
        marginBottom: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      },
      smartTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.caption + 1,
        color: t.primary,
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
      advancedToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        marginBottom: 8,
      },
      advancedToggleText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption + 1,
        color: t.primary,
      },
    }),
    reportTheme
  );

  return (
    <View>
      <Text style={styles.heading}>Add details</Text>
      <Text style={styles.subheading}>
        Only share what you know right now. Everything here is optional.
      </Text>

      <Field
        label="Short description"
        placeholder="What do responders need to know first?"
        value={description}
        onChangeText={onChangeDescription}
        styles={styles}
        reportTheme={reportTheme}
      />

      <Field
        label="Nearest landmark"
        placeholder="e.g. Near city hall, behind gas station"
        value={landmark}
        onChangeText={onChangeLandmark}
        styles={styles}
        reportTheme={reportTheme}
      />

      <Field
        label="People involved"
        placeholder="Number, if known"
        value={peopleInvolved}
        onChangeText={(text) => onChangePeopleInvolved(text.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        styles={styles}
        reportTheme={reportTheme}
      />

      {profileFields.length > 0 ? (
        <View style={styles.smartSection}>
          <Text style={styles.smartTitle}>Helpful for this emergency</Text>
          {profileFields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={extraDetails[field.key] || ""}
              onChangeText={(text) => onChangeExtraDetail(field.key, text)}
              keyboardType={field.keyboard}
              styles={styles}
              reportTheme={reportTheme}
            />
          ))}
        </View>
      ) : null}

      <Pressable
        style={styles.advancedToggle}
        onPress={onToggleAdvanced}
        accessibilityRole="button"
        accessibilityState={{ expanded: showAdvanced }}
      >
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? "Hide extra notes" : "Add more details"}
        </Text>
        {showAdvanced ? (
          <ChevronUp size={18} color={reportTheme.primary} />
        ) : (
          <ChevronDown size={18} color={reportTheme.primary} />
        )}
      </Pressable>

      {showAdvanced ? (
        <TextInput
          style={[styles.input, styles.textArea]}
          value={additionalNotes}
          onChangeText={onChangeAdditionalNotes}
          placeholder="Any additional context for dispatchers"
          placeholderTextColor={reportTheme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Additional notes"
        />
      ) : null}
    </View>
  );
}
