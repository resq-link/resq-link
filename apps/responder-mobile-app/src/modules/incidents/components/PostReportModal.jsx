import React from "react";
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
import { X, ClipboardList, Users } from "lucide-react-native";
import { radii, spacing } from "@/theme";

export default function PostReportModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  form,
  setForm,
  error,
  colors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerTitleRow}>
                <ClipboardList size={22} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Post Incident Report</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                accessibilityRole="button"
                accessibilityLabel="Close report modal"
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Please fill in the incident outcome details below. These fields are reference points for dispatch and can be left blank.
              </Text>

              {/* SECTION 1: Incident details */}
              <View style={[styles.groupContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.groupHeader}>
                  <ClipboardList size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Incident Outcome</Text>
                </View>

                {/* Field 1: Reason for incident */}
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Reason for Incident</Text>
                  <TextInput
                    value={form.reasonForIncident}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, reasonForIncident: value }))
                    }
                    placeholder="e.g. Kitchen cooking mishap, electrical outage"
                    placeholderTextColor={colors.textMuted}
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    The primary cause or source of the emergency.
                  </Text>
                </View>

                {/* Field 2: Notes */}
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Scene Observations & Notes</Text>
                  <TextInput
                    value={form.notes}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, notes: value }))
                    }
                    placeholder="Describe scene state, hazard controls, or actions taken..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Any secondary observations or remarks regarding the site.
                  </Text>
                </View>
              </View>

              {/* SECTION 2: Impact & Casualties */}
              <View style={[styles.groupContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.groupHeader}>
                  <Users size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Casualties & Impact</Text>
                </View>

                {/* Field 3: Number of people involved */}
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Number of People Involved</Text>
                  <TextInput
                    value={form.peopleInvolved}
                    onChangeText={(value) =>
                      setForm((current) => ({
                        ...current,
                        peopleInvolved: value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="e.g. 0 or 2"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Total count of affected civilian or responders.
                  </Text>
                </View>

                {/* Field 4: Status of people involved */}
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Civilian Status / Injuries</Text>
                  <TextInput
                    value={form.peopleStatus}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, peopleStatus: value }))
                    }
                    placeholder="e.g. Stable, conscious, minor burns treated"
                    placeholderTextColor={colors.textMuted}
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Current health state of all patients/individuals on scene.
                  </Text>
                </View>

                {/* Field 5: Hospital */}
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Transported Hospital (Optional)</Text>
                  <TextInput
                    value={form.hospital}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, hospital: value }))
                    }
                    placeholder="e.g. City General Hospital, Emergency Wing"
                    placeholderTextColor={colors.textMuted}
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    If anyone was evacuated to a clinic or hospital, name it.
                  </Text>
                </View>
              </View>

              {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isSubmitting}
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.accent },
                  isSubmitting && styles.disabledButton,
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    height: "90%",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalDescription: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  groupContainer: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(128,128,128,0.2)",
    paddingBottom: 6,
  },
  groupTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
  },
  submitButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 140,
  },
  submitButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
