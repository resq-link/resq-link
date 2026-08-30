import React, { useCallback, useMemo } from "react";
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
import { Camera, ClipboardList, Minus, Plus, X } from "lucide-react-native";
import {
  PEOPLE_AFFECTED_OPTIONS,
  SITUATION_STATUS_OPTIONS,
  getActionsTakenOptionsForAgency,
} from "@packages/firebase";
import IncidentPhotoField from "./IncidentPhotoField";
import { radii, spacing } from "@/theme";

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

export default function SceneReportModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  form,
  setForm,
  error,
  colors,
  agency,
  resourceType,
}) {
  const actionOptions = useMemo(
    () => getActionsTakenOptionsForAgency(agency, resourceType),
    [agency, resourceType],
  );

  const hasNonNonePeople = form.peopleAffected.some((value) => value !== "none");
  const showOtherActions = form.actionsTaken.includes("Other");

  const togglePeopleAffected = (value) => {
    setForm((current) => {
      if (value === "none") {
        return {
          ...current,
          peopleAffected: ["none"],
          peopleAffectedCounts: { injured: 0, rescued: 0, fatality: 0 },
        };
      }

      const withoutNone = current.peopleAffected.filter((entry) => entry !== "none");
      const exists = withoutNone.includes(value);
      const next = exists
        ? withoutNone.filter((entry) => entry !== value)
        : [...withoutNone, value];

      const counts = { ...current.peopleAffectedCounts };
      if (exists) {
        counts[value] = 0;
      } else if (counts[value] == null) {
        counts[value] = 0;
      }

      return {
        ...current,
        peopleAffected: next.length ? next : ["none"],
        peopleAffectedCounts: counts,
      };
    });
  };

  const adjustPeopleCount = (category, delta) => {
    setForm((current) => {
      const counts = { ...current.peopleAffectedCounts };
      const currentVal = Number.parseInt(String(counts[category] ?? 0), 10) || 0;
      counts[category] = Math.max(0, currentVal + delta);
      return { ...current, peopleAffectedCounts: counts };
    });
  };

  const setPeopleCount = (category, rawValue) => {
    const digits = rawValue.replace(/[^0-9]/g, "");
    const parsed = digits === "" ? 0 : Number.parseInt(digits, 10);
    setForm((current) => ({
      ...current,
      peopleAffectedCounts: {
        ...current.peopleAffectedCounts,
        [category]: parsed,
      },
    }));
  };

  const toggleAction = (action) => {
    setForm((current) => {
      const exists = current.actionsTaken.includes(action);
      const next = exists
        ? current.actionsTaken.filter((entry) => entry !== action)
        : [...current.actionsTaken, action];
      return {
        ...current,
        actionsTaken: next,
        actionsTakenOther: action === "Other" && exists ? "" : current.actionsTakenOther,
      };
    });
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
                    Scene Report
                  </Text>
                  <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                    Quick operational summary — then submit and resolve.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                accessibilityRole="button"
                accessibilityLabel="Close scene report"
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                SITUATION STATUS *
              </Text>
              <View style={styles.chipWrap}>
                {SITUATION_STATUS_OPTIONS.map((option) => (
                  <QuickChip
                    key={option.value}
                    label={option.label}
                    selected={form.situationStatus === option.value}
                    onPress={() =>
                      setForm((current) => ({ ...current, situationStatus: option.value }))
                    }
                    colors={colors}
                    disabled={isSubmitting}
                  />
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                PEOPLE AFFECTED *
              </Text>
              <View style={styles.chipWrap}>
                {PEOPLE_AFFECTED_OPTIONS.map((option) => (
                  <QuickChip
                    key={option.value}
                    label={option.label}
                    selected={form.peopleAffected.includes(option.value)}
                    onPress={() => togglePeopleAffected(option.value)}
                    colors={colors}
                    disabled={isSubmitting}
                  />
                ))}
              </View>

              {hasNonNonePeople ? (
                <View style={styles.peopleCountsBlock}>
                  {[
                    { key: "injured", label: "Injured" },
                    { key: "rescued", label: "Rescued" },
                    { key: "fatality", label: "Fatalities" },
                  ]
                    .filter((entry) => form.peopleAffected.includes(entry.key))
                    .map((entry) => (
                      <View key={entry.key} style={styles.fieldContainer}>
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>
                          {entry.label}
                        </Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            onPress={() => adjustPeopleCount(entry.key, -1)}
                            disabled={isSubmitting}
                            style={[
                              styles.counterButton,
                              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                            ]}
                          >
                            <Minus size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TextInput
                            value={String(form.peopleAffectedCounts?.[entry.key] ?? 0)}
                            onChangeText={(value) => setPeopleCount(entry.key, value)}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            editable={!isSubmitting}
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
                            onPress={() => adjustPeopleCount(entry.key, 1)}
                            disabled={isSubmitting}
                            style={[
                              styles.counterButton,
                              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                            ]}
                          >
                            <Plus size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                </View>
              ) : null}

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                ACTIONS TAKEN *
              </Text>
              <View style={styles.chipWrap}>
                {actionOptions.map((action) => (
                  <QuickChip
                    key={action}
                    label={action}
                    selected={form.actionsTaken.includes(action)}
                    onPress={() => toggleAction(action)}
                    colors={colors}
                    disabled={isSubmitting}
                  />
                ))}
              </View>

              {showOtherActions ? (
                <TextInput
                  value={form.actionsTakenOther}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, actionsTakenOther: value }))
                  }
                  placeholder="Describe other action"
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
              ) : null}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.sectionHeader}>
                <Camera size={17} color={colors.accent} />
                <Text style={[styles.sectionTitleInline, { color: colors.textSecondary }]}>
                  Action Photo (Optional)
                </Text>
              </View>

              <IncidentPhotoField
                label="Action Photo"
                hint="Document response activity or result."
                noun="action photo"
                uri={form.actionPhotoUri}
                onChange={handleActionPhotoChange}
                disabled={isSubmitting}
                colors={colors}
              />

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                REMARKS (OPTIONAL)
              </Text>
              <TextInput
                value={form.remarks}
                onChangeText={(value) => setForm((current) => ({ ...current, remarks: value }))}
                placeholder="Short notes if needed"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
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
                  {isSubmitting ? "Submitting…" : "Submit & Resolve Incident"}
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
  keyboardView: { flex: 1 },
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
  headerCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
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
  formScroll: { flex: 1 },
  formScrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitleInline: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  quickChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  fieldContainer: { marginBottom: spacing.sm },
  peopleCountsBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: spacing.sm },
  counterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: spacing.md,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  divider: { height: 1, marginVertical: spacing.lg },
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
  cancelButtonText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  submitButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#FFFFFF" },
  disabledButton: { opacity: 0.55 },
});
