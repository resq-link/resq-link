import React from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, AlertTriangle } from "lucide-react-native";
import { radii, spacing } from "@/theme";

export default function DeclineModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  reason,
  setReason,
  error,
  colors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            <View style={styles.header}>
              <AlertTriangle size={24} color={colors.error} style={{ marginRight: 8 }} />
              <Text accessibilityRole="header" style={[styles.modalTitle, { color: colors.text }]}>Decline Case</Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Please explain why you cannot respond to this incident so dispatch can reassign it immediately.
            </Text>

            {/* Input field with label */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Reason for Declining</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Provide a clear explanation (e.g. out of service, vehicle trouble, flat tire)..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                editable={!isSubmitting}
                accessibilityLabel="Reason for declining response"
                accessibilityHint="Explain why you cannot respond to this emergency incident"
                style={[
                  styles.reasonInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

            {/* Actions */}
            <View style={styles.reasonActions}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={[styles.reasonCancelButton, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel decline"
              >
                <Text style={[styles.reasonCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isSubmitting || !reason.trim()}
                style={[
                  styles.reasonSubmitButton,
                  { backgroundColor: colors.error },
                  (isSubmitting || !reason.trim()) && styles.disabledButton,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Submit decline case reason"
                accessibilityState={{ disabled: isSubmitting || !reason.trim() }}
              >
                <Text style={styles.reasonSubmitText}>
                  {isSubmitting ? "Declining..." : "Submit Decline"}
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
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
  },
  modalDescription: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    marginBottom: 6,
  },
  reasonInput: {
    minHeight: 100,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    textAlignVertical: "top",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  reasonActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reasonCancelButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reasonCancelText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
  },
  reasonSubmitButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 120,
    alignItems: "center",
  },
  reasonSubmitText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
