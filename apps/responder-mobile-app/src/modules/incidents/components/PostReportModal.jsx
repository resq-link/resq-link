import React, { useMemo, useCallback } from "react";
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
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react-native";
import IncidentPhotoField from "./IncidentPhotoField";
import { radii, spacing } from "@/theme";

const causePresets = [
  "Accidental",
  "Electrical",
  "Medical",
  "Vehicular",
  "Weather-related",
  "Under investigation",
];

const statusPresets = [
  "No injuries",
  "Stable",
  "Minor injuries",
  "Critical",
  "Transported",
];

const notePresets = [
  "Scene secured",
  "Hazards controlled",
  "Area turned over",
  "Further monitoring needed",
];

const hospitalPresets = [
  "No transport",
  "TCPGH",
  "City Health Office",
  "Private clinic",
];

const getPeopleCount = (value) => {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const appendNote = (current, note) => {
  const trimmed = current.trim();
  if (!trimmed) return note;
  if (trimmed.toLowerCase().includes(note.toLowerCase())) return current;
  return `${trimmed}\n${note}`;
};

function QuickChip({ label, selected, onPress, colors, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      style={[
        styles.quickChip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceHighlight,
          borderColor: selected ? colors.accent : colors.border,
        },
        disabled && styles.disabledButton,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Text
        style={[
          styles.quickChipText,
          { color: selected ? "#FFFFFF" : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ label, hint, colors }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

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
  const peopleCount = getPeopleCount(form.peopleInvolved);
  const hasTransport = Boolean(form.hospital?.trim()) && form.hospital !== "No transport";
  const completionItems = useMemo(
    () => [
      Boolean(form.reasonForIncident?.trim()),
      Boolean(form.peopleStatus?.trim()),
      Boolean(form.notes?.trim()),
    ],
    [form.reasonForIncident, form.peopleStatus, form.notes]
  );
  const completedCount = completionItems.filter(Boolean).length;

  const updatePeopleCount = (nextCount) => {
    setForm((current) => ({
      ...current,
      peopleInvolved: String(Math.max(0, nextCount)),
    }));
  };

  const handleActionPhotoChange = useCallback(
    (uri) => {
      if (isSubmitting) return;
      setForm((current) => ({ ...current, actionPhotoUri: uri }));
    },
    [isSubmitting, setForm],
  );

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
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <View style={[styles.headerIcon, { backgroundColor: colors.accent + "1F" }]}>
                  <ClipboardList size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text accessibilityRole="header" style={[styles.modalTitle, { color: colors.text }]}>
                    Post Report
                  </Text>
                  <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                    Final scene outcome and handover notes.
                  </Text>
                </View>
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

            <View style={[styles.progressStrip, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={styles.progressCopy}>
                <CheckCircle2 size={16} color={colors.accent} />
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {completedCount}/3 key details filled
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(12, (completedCount / 3) * 100)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionHeader}>
                <AlertTriangle size={17} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Incident Outcome
                </Text>
              </View>

              <View style={styles.fieldContainer}>
                <FieldLabel label="Reason / Cause" hint="Tap a preset or type details" colors={colors} />
                <View style={styles.chipWrap}>
                  {causePresets.map((preset) => (
                    <QuickChip
                      key={preset}
                      label={preset}
                      selected={form.reasonForIncident === preset}
                      onPress={() =>
                        setForm((current) => ({ ...current, reasonForIncident: preset }))
                      }
                      colors={colors}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>
                <TextInput
                  value={form.reasonForIncident}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, reasonForIncident: value }))
                  }
                  placeholder="Primary cause or source of the emergency"
                  placeholderTextColor={colors.textMuted}
                  editable={!isSubmitting}
                  accessibilityLabel="Reason for incident"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.fieldContainer}>
                <FieldLabel label="Scene Notes" hint="Actions, hazards, handover" colors={colors} />
                <View style={styles.chipWrap}>
                  {notePresets.map((preset) => (
                    <QuickChip
                      key={preset}
                      label={preset}
                      selected={form.notes?.toLowerCase().includes(preset.toLowerCase())}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          notes: appendNote(current.notes || "", preset),
                        }))
                      }
                      colors={colors}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>
                <TextInput
                  value={form.notes}
                  onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
                  placeholder="Describe scene state, hazard controls, actions taken, or endorsements..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={5}
                  editable={!isSubmitting}
                  accessibilityLabel="Scene observations and notes"
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
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.sectionHeader}>
                <Users size={17} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  People & Transport
                </Text>
              </View>

              <View style={styles.fieldContainer}>
                <FieldLabel label="People Involved" hint="Affected civilians/responders" colors={colors} />
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    onPress={() => updatePeopleCount(peopleCount - 1)}
                    disabled={isSubmitting || peopleCount === 0}
                    style={[
                      styles.counterButton,
                      { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                      (isSubmitting || peopleCount === 0) && styles.disabledButton,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease people involved"
                  >
                    <Minus size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    value={form.peopleInvolved}
                    onChangeText={(value) =>
                      setForm((current) => ({
                        ...current,
                        peopleInvolved: value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    editable={!isSubmitting}
                    accessibilityLabel="Number of people involved"
                    style={[
                      styles.counterInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() => updatePeopleCount(peopleCount + 1)}
                    disabled={isSubmitting}
                    style={[
                      styles.counterButton,
                      { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                      isSubmitting && styles.disabledButton,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Increase people involved"
                  >
                    <Plus size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <FieldLabel label="Condition / Status" hint="Current patient or civilian state" colors={colors} />
                <View style={styles.chipWrap}>
                  {statusPresets.map((preset) => (
                    <QuickChip
                      key={preset}
                      label={preset}
                      selected={form.peopleStatus === preset}
                      onPress={() => setForm((current) => ({ ...current, peopleStatus: preset }))}
                      colors={colors}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>
                <TextInput
                  value={form.peopleStatus}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, peopleStatus: value }))
                  }
                  placeholder="e.g. Stable, conscious, minor burns treated"
                  placeholderTextColor={colors.textMuted}
                  editable={!isSubmitting}
                  accessibilityLabel="Civilian status and injuries"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.fieldContainer}>
                <FieldLabel label="Transport / Facility" hint={hasTransport ? "Facility recorded" : "Optional"} colors={colors} />
                <View style={styles.chipWrap}>
                  {hospitalPresets.map((preset) => (
                    <QuickChip
                      key={preset}
                      label={preset}
                      selected={form.hospital === preset || (!form.hospital && preset === "No transport")}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          hospital: preset === "No transport" ? "" : preset,
                        }))
                      }
                      colors={colors}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>
                <View style={styles.inputIconRow}>
                  <Building2 size={17} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={form.hospital}
                    onChangeText={(value) => setForm((current) => ({ ...current, hospital: value }))}
                    placeholder="Hospital, clinic, or receiving facility"
                    placeholderTextColor={colors.textMuted}
                    editable={!isSubmitting}
                    accessibilityLabel="Transported hospital name"
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.sectionHeader}>
                <Camera size={17} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Response Evidence
                </Text>
              </View>

              <IncidentPhotoField
                label="Action Photo"
                hint="Document the response action performed on scene."
                noun="action photo"
                uri={form.actionPhotoUri}
                onChange={handleActionPhotoChange}
                disabled={isSubmitting}
                colors={colors}
              />

              {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={[
                  styles.cancelButton,
                  { borderColor: colors.border, backgroundColor: colors.surfaceHighlight },
                  isSubmitting && styles.disabledButton,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel report submission"
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
                accessibilityRole="button"
                accessibilityLabel="Submit report"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? "Submitting..." : "Complete Case"}
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "72%",
    width: "100%",
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(148, 163, 184, 0.45)",
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  modalDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  progressStrip: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabelRow: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  fieldHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  quickChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  textArea: {
    minHeight: 118,
    textAlignVertical: "top",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  inputIconRow: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: spacing.md,
    top: 14,
    zIndex: 2,
  },
  inputWithIcon: {
    paddingLeft: 42,
  },
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
