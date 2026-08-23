import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { radii, spacing } from "@/theme";

/**
 * Shared bottom-sheet shell for operational forms (Scene Assessment, Post Report).
 */
export default function OperationalFormSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  onSubmit,
  submitLabel = "Submit",
  submittingLabel = "Submitting…",
  isSubmitting = false,
  submitDisabled = false,
  cancelLabel = "Cancel",
  showCancel = true,
  colors,
  presentation = "bottomSheet",
}) {
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.sheetOverlay ?? "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        },
        sheet: {
          backgroundColor: colors.background,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          maxHeight: "92%",
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
        handle: {
          alignSelf: "center",
          width: 44,
          height: 5,
          borderRadius: radii.pill,
          backgroundColor: colors.border,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
        },
        header: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerText: {
          flex: 1,
          paddingRight: spacing.md,
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.text,
        },
        subtitle: {
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
          marginTop: 4,
        },
        closeButton: {
          width: 44,
          height: 44,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        scroll: {
          flexGrow: 0,
        },
        scrollContent: {
          padding: spacing.lg,
          paddingBottom: spacing.xl,
        },
        footer: {
          flexDirection: "row",
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        cancelButton: {
          flex: 1,
          minHeight: 48,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        cancelText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: colors.textSecondary,
        },
        submitButton: {
          flex: 2,
          minHeight: 48,
          borderRadius: radii.lg,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.sm,
        },
        submitText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: "#FFFFFF",
        },
        disabled: {
          opacity: 0.5,
        },
      }),
    [colors, insets.bottom]
  );

  if (presentation === "pageSheet") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                {Icon ? <Icon size={20} color={colors.accent} /> : null}
                <Text style={styles.title}>{title}</Text>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close form"
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <View style={styles.footer}>
            {showCancel ? (
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={styles.cancelButton}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={onSubmit}
              disabled={isSubmitting || submitDisabled}
              style={[styles.submitButton, (isSubmitting || submitDisabled) && styles.disabled]}
              accessibilityRole="button"
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.submitText}>
                {isSubmitting ? submittingLabel : submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                {Icon ? <Icon size={20} color={colors.accent} /> : null}
                <Text style={styles.title}>{title}</Text>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close form"
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
          <View style={styles.footer}>
            {showCancel ? (
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={styles.cancelButton}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={onSubmit}
              disabled={isSubmitting || submitDisabled}
              style={[styles.submitButton, (isSubmitting || submitDisabled) && styles.disabled]}
              accessibilityRole="button"
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.submitText}>
                {isSubmitting ? submittingLabel : submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
