import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Text,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarClock, MapPin } from "lucide-react-native";
import OperationalFormSheet from "@/components/forms/OperationalFormSheet";
import IncidentPhotoField from "@/modules/incidents/components/IncidentPhotoField";
import { radii, spacing } from "@/theme";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPickerPreview(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mergeDatePart(base, picked) {
  const merged = new Date(base);
  merged.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return merged;
}

function mergeTimePart(base, picked) {
  const merged = new Date(base);
  merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return merged;
}

export default function TouchdownTimeModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  acceptedAt,
  error,
  colors,
}) {
  const acceptedDate = useMemo(() => toDate(acceptedAt), [acceptedAt]);
  const [selectedAt, setSelectedAt] = useState(() => new Date());
  const [photoUri, setPhotoUri] = useState("");
  const [validationError, setValidationError] = useState("");
  /** Android only — never keep DateTimePicker mounted; it reopens the dialog on re-render. */
  const [androidPickerStep, setAndroidPickerStep] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedAt(new Date());
    setPhotoUri("");
    setValidationError("");
    setAndroidPickerStep(null);
  }, [visible]);

  const minimumDate = acceptedDate ?? undefined;
  const maximumDate = new Date();

  const validateSelection = (candidate, uri) => {
    if (!uri?.trim()) {
      return "Capture an on-scene photo before confirming touchdown.";
    }
    if (candidate.getTime() > Date.now()) {
      return "Touchdown time cannot be in the future.";
    }
    if (acceptedDate && candidate.getTime() < acceptedDate.getTime()) {
      return "Touchdown time cannot be before case acceptance.";
    }
    return "";
  };

  const applySelectedAt = (nextDate) => {
    setSelectedAt(nextDate);
    setValidationError(validateSelection(nextDate, photoUri));
  };

  const handleIosChange = (_event, nextDate) => {
    if (!nextDate) return;
    applySelectedAt(nextDate);
  };

  const handleAndroidChange = (event, nextDate) => {
    const eventType = event?.type;

    if (eventType === "dismissed" || !nextDate) {
      setAndroidPickerStep(null);
      return;
    }

    if (androidPickerStep === "date") {
      applySelectedAt(mergeDatePart(selectedAt, nextDate));
      setAndroidPickerStep(null);
      // Open time picker on the next tick after the date dialog closes.
      requestAnimationFrame(() => setAndroidPickerStep("time"));
      return;
    }

    if (androidPickerStep === "time") {
      setAndroidPickerStep(null);
      setSelectedAt((prev) => {
        const merged = mergeTimePart(prev, nextDate);
        setValidationError(validateSelection(merged, photoUri));
        return merged;
      });
    }
  };

  const openAndroidPicker = () => {
    if (isSubmitting) return;
    setAndroidPickerStep("date");
  };

  const handlePhotoChange = (uri) => {
    setPhotoUri(uri);
    setValidationError(validateSelection(selectedAt, uri));
  };

  const handleSubmit = () => {
    const message = validateSelection(selectedAt, photoUri);
    if (message) {
      setValidationError(message);
      return;
    }
    onSubmit?.(selectedAt, photoUri);
  };

  const displayError = validationError || error;

  return (
    <OperationalFormSheet
      visible={visible}
      onClose={onClose}
      title="Touchdown"
      subtitle="Document arrival with an on-scene photo and touchdown time"
      icon={MapPin}
      onSubmit={handleSubmit}
      submitLabel="Confirm Touchdown"
      submittingLabel="Uploading…"
      isSubmitting={isSubmitting}
      submitDisabled={!photoUri?.trim() || Boolean(validationError)}
      colors={colors}
    >
      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          ON-SCENE PHOTO
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Capture what you found upon arrival. Required before touchdown is recorded.
        </Text>

        <IncidentPhotoField
          label="On-Scene Photo"
          hint="Document the scene as you found it."
          noun="on-scene photo"
          uri={photoUri}
          onChange={handlePhotoChange}
          disabled={isSubmitting}
          colors={colors}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          TOUCHDOWN TIME
        </Text>
        <Text style={[styles.previewValue, { color: colors.text }]}>
          {formatPickerPreview(selectedAt)}
        </Text>

        {Platform.OS === "ios" ? (
          <View
            style={[
              styles.pickerWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <DateTimePicker
              value={selectedAt}
              mode="datetime"
              display="spinner"
              onChange={handleIosChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant={colors.visualScheme === "dark" ? "dark" : "light"}
            />
          </View>
        ) : (
          <>
            <Pressable
              onPress={openAndroidPicker}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.androidPickerButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Set touchdown date and time"
            >
              <CalendarClock size={18} color={colors.accent} />
              <Text style={[styles.androidPickerButtonText, { color: colors.text }]}>
                Set date & time
              </Text>
            </Pressable>

            {androidPickerStep ? (
              <DateTimePicker
                value={selectedAt}
                mode={androidPickerStep}
                display="default"
                onChange={handleAndroidChange}
                minimumDate={androidPickerStep === "date" ? minimumDate : undefined}
                maximumDate={androidPickerStep === "date" ? maximumDate : undefined}
              />
            ) : null}
          </>
        )}

        {acceptedDate ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Must be on or after acceptance ({formatPickerPreview(acceptedDate)}).
          </Text>
        ) : null}

        {displayError ? (
          <Text style={[styles.error, { color: colors.error }]}>{displayError}</Text>
        ) : null}
      </View>
    </OperationalFormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  previewValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: spacing.md,
  },
  pickerWrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  androidPickerButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  androidPickerButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
