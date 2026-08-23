import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Camera, ClipboardList, X } from "lucide-react-native";
import { getSceneAssessmentFieldDefs } from "@packages/firebase";
import IncidentPhotoField from "./IncidentPhotoField";
import { radii, spacing } from "@/theme";

function FieldLabel({ label, colors }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
  );
}

export default function SceneAssessmentModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  incidentType,
  initialFields = {},
  initialScenePhotoUrl = null,
  error,
  colors,
}) {
  const [fields, setFields] = React.useState({});
  const [scenePhotoUri, setScenePhotoUri] = React.useState("");

  const fieldDefs = useMemo(
    () => getSceneAssessmentFieldDefs(incidentType),
    [incidentType],
  );

  React.useEffect(() => {
    if (!visible) return;
    const next = {};
    fieldDefs.forEach((field) => {
      next[field.key] = initialFields[field.key] || "";
    });
    setFields(next);
    setScenePhotoUri("");
  }, [visible, fieldDefs, initialFields]);

  const hasValue = Object.values(fields).some((value) => String(value || "").trim());

  const handleSubmit = () => {
    const payload = Object.entries(fields).reduce((acc, [key, value]) => {
      const trimmed = String(value || "").trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    }, {});
    onSubmit(payload, scenePhotoUri || null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <ClipboardList size={20} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>Scene Assessment</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            style={[styles.closeButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Close scene assessment form"
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Document on-scene conditions for dispatch. At least one field is required.
          </Text>

          {fieldDefs.map((field) => (
            <View key={field.key} style={styles.fieldContainer}>
              <FieldLabel label={field.label} colors={colors} />
              <TextInput
                value={fields[field.key] || ""}
                onChangeText={(text) =>
                  setFields((prev) => ({ ...prev, [field.key]: text }))
                }
                placeholder={`Enter ${field.label.toLowerCase()}`}
                placeholderTextColor={colors.textMuted}
                multiline={field.key === "remarks"}
                numberOfLines={field.key === "remarks" ? 4 : 1}
                editable={!isSubmitting}
                style={[
                  styles.input,
                  field.key === "remarks" && styles.inputMultiline,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityLabel={field.label}
              />
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sectionHeader}>
            <Camera size={17} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              On-Scene Evidence
            </Text>
          </View>

          {initialScenePhotoUrl && !scenePhotoUri ? (
            <Text style={[styles.existingPhotoNote, { color: colors.textMuted }]}>
              A previous on-scene photo is saved. Upload a new photo below to replace it.
            </Text>
          ) : null}

          <IncidentPhotoField
            label="On-Scene Photo"
            hint="Capture the scene condition upon arrival."
            noun="on-scene photo"
            uri={scenePhotoUri}
            onChange={setScenePhotoUri}
            disabled={isSubmitting}
            colors={colors}
          />

          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !hasValue}
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              { backgroundColor: colors.accent },
              (isSubmitting || !hasValue) && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit scene assessment"
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Assessment"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
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
    minHeight: 44,
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
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  existingPhotoNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: spacing.sm,
  },
});
