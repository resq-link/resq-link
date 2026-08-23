import React, { useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import { ClipboardList } from "lucide-react-native";
import { getSceneAssessmentFieldDefs } from "@packages/firebase";
import OperationalFormSheet from "@/components/forms/OperationalFormSheet";
import { radii, spacing } from "@/theme";

/** Group field keys into operational sections when labels match known patterns. */
const FIELD_GROUPS = [
  {
    title: "Scene Conditions",
    keys: [
      "fireScale",
      "affectedArea",
      "collisionType",
      "hazardType",
      "utilityStatus",
      "incidentSummary",
      "sceneStatus",
      "patientCondition",
    ],
  },
  {
    title: "People / Casualties",
    keys: [
      "confirmedCasualties",
      "peopleRescued",
      "patientsOnScene",
      "injuredPersons",
      "treatmentProvided",
      "transportStatus",
    ],
  },
  {
    title: "Hazards",
    keys: ["hazards", "threatNature", "suspectStatus"],
  },
  {
    title: "Current Operations",
    keys: ["currentOperations"],
  },
  {
    title: "Remarks",
    keys: ["remarks"],
  },
];

function groupFields(fieldDefs) {
  const assigned = new Set();
  const groups = [];

  FIELD_GROUPS.forEach(({ title, keys }) => {
    const fields = fieldDefs.filter((f) => keys.includes(f.key));
    if (fields.length === 0) return;
    fields.forEach((f) => assigned.add(f.key));
    groups.push({ title, fields });
  });

  const remaining = fieldDefs.filter((f) => !assigned.has(f.key));
  if (remaining.length > 0) {
    groups.push({ title: "Additional Details", fields: remaining });
  }

  return groups.length > 0 ? groups : [{ title: "Scene Assessment", fields: fieldDefs }];
}

function FieldInput({ field, value, onChange, isSubmitting, colors }) {
  const isRemarks = field.key === "remarks";
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
      <TextInput
        value={value || ""}
        onChangeText={onChange}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        placeholderTextColor={colors.textMuted}
        multiline={isRemarks}
        numberOfLines={isRemarks ? 4 : 1}
        editable={!isSubmitting}
        style={[
          styles.input,
          isRemarks && styles.inputMultiline,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        accessibilityLabel={field.label}
      />
    </View>
  );
}

export default function SceneAssessmentModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  incidentType,
  initialFields = {},
  error,
  colors,
}) {
  const [fields, setFields] = React.useState({});
  const wasVisibleRef = React.useRef(false);

  const fieldDefs = useMemo(
    () => getSceneAssessmentFieldDefs(incidentType),
    [incidentType]
  );

  const groupedFields = useMemo(() => groupFields(fieldDefs), [fieldDefs]);

  React.useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (!justOpened) return;

    const next = {};
    fieldDefs.forEach((field) => {
      next[field.key] = initialFields[field.key] || "";
    });
    setFields(next);
  }, [visible, fieldDefs, initialFields]);

  const hasValue = Object.values(fields).some((value) => String(value || "").trim());

  const handleSubmit = () => {
    const payload = Object.entries(fields).reduce((acc, [key, value]) => {
      const trimmed = String(value || "").trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    }, {});
    onSubmit(payload);
  };

  return (
    <OperationalFormSheet
      visible={visible}
      onClose={onClose}
      title="Scene Assessment"
      subtitle="Document on-scene conditions and response actions."
      icon={ClipboardList}
      onSubmit={handleSubmit}
      submitLabel="Submit Assessment"
      submittingLabel="Submitting Assessment…"
      isSubmitting={isSubmitting}
      submitDisabled={!hasValue}
      colors={colors}
      presentation="pageSheet"
    >
      {groupedFields.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.title}</Text>
          {group.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={fields[field.key]}
              onChange={(text) => setFields((prev) => ({ ...prev, [field.key]: text }))}
              isSubmitting={isSubmitting}
              colors={colors}
            />
          ))}
        </View>
      ))}

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </OperationalFormSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
    paddingTop: spacing.sm,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: spacing.sm,
  },
});
