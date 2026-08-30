import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import * as Location from "expo-location";
import { Check, MapPin, Pencil } from "lucide-react-native";
import { validateArrivalTime } from "@packages/firebase";
import OperationalFormSheet from "@/components/forms/OperationalFormSheet";
import IncidentPhotoField from "@/modules/incidents/components/IncidentPhotoField";
import { radii, spacing } from "@/theme";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatArrivalTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatArrivalDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a Date as 12-hour time string for the typable input. */
function formatTimeInputValue(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minuteStr = String(minutes).padStart(2, "0");
  return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Parse a 12-hour time string onto a fixed calendar date.
 * Accepts: "6:24 PM", "06:24 PM", "6:24PM", "6:24 pm"
 */
function parseTimeOnDate(datePart, timeStr) {
  const trimmed = String(timeStr || "").trim();
  const match = trimmed.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = (match[3] || "").toUpperCase();

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  if (period === "AM" || period === "PM") {
    if (hours < 1 || hours > 12) return null;
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }

  const merged = new Date(datePart);
  merged.setHours(hours, minutes, 0, 0);
  return Number.isNaN(merged.getTime()) ? null : merged;
}

export default function OnSceneModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  acceptedAt,
  error,
  colors,
  draft,
  onDraftChange,
}) {
  const acceptedDate = useMemo(() => toDate(acceptedAt), [acceptedAt]);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [validationError, setValidationError] = useState("");
  const [gpsStatus, setGpsStatus] = useState("pending");
  const [gpsError, setGpsError] = useState("");
  const timeInputRef = useRef(null);

  const selectedAt = draft?.arrivalTime instanceof Date ? draft.arrivalTime : new Date();
  const photoUri = draft?.photoUri || "";

  useEffect(() => {
    if (!visible) {
      setIsEditingTime(false);
      return;
    }

    if (!draft?.arrivalTime) {
      onDraftChange?.((current) => ({
        ...current,
        arrivalTime: new Date(),
      }));
    }

    let isMounted = true;
    const captureGps = async () => {
      if (draft?.gps?.latitude != null && draft?.gps?.longitude != null) {
        setGpsStatus("captured");
        return;
      }

      setGpsStatus("pending");
      setGpsError("");
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) {
            setGpsStatus("unavailable");
            setGpsError("Location permission denied. On Scene can still be confirmed.");
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!isMounted) return;

        onDraftChange?.((current) => ({
          ...current,
          gps: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            capturedAt: new Date(),
          },
        }));
        setGpsStatus("captured");
      } catch {
        if (isMounted) {
          setGpsStatus("unavailable");
          setGpsError("Unable to capture GPS automatically.");
        }
      }
    };

    captureGps();
    return () => {
      isMounted = false;
    };
  }, [visible, draft?.arrivalTime, draft?.gps?.latitude, draft?.gps?.longitude, onDraftChange]);

  const validateSelection = (candidate, uri) => {
    if (!uri?.trim()) {
      return "Capture an on-scene photo before confirming on scene.";
    }
    return validateArrivalTime(candidate, { acceptedAt: acceptedDate }) || "";
  };

  const applySelectedAt = (nextDate) => {
    onDraftChange?.((current) => ({ ...current, arrivalTime: nextDate }));
    setValidationError(validateSelection(nextDate, photoUri));
  };

  const startEditingTime = () => {
    if (isSubmitting) return;
    setTimeInput(formatTimeInputValue(selectedAt));
    setIsEditingTime(true);
    requestAnimationFrame(() => timeInputRef.current?.focus());
  };

  const commitTimeInput = () => {
    const parsed = parseTimeOnDate(selectedAt, timeInput);
    if (!parsed) {
      setValidationError("Enter a valid time (e.g. 6:24 PM).");
      return;
    }
    applySelectedAt(parsed);
    setIsEditingTime(false);
  };

  const handlePhotoChange = (uri) => {
    onDraftChange?.((current) => ({ ...current, photoUri: uri }));
    setValidationError(validateSelection(selectedAt, uri));
  };

  const handleSubmit = () => {
    let arrivalTime = selectedAt;

    if (isEditingTime && timeInput.trim()) {
      const parsed = parseTimeOnDate(selectedAt, timeInput);
      if (!parsed) {
        setValidationError("Enter a valid time (e.g. 6:24 PM).");
        return;
      }
      arrivalTime = parsed;
      applySelectedAt(parsed);
      setIsEditingTime(false);
    }

    const message = validateSelection(arrivalTime, photoUri);
    if (message) {
      setValidationError(message);
      return;
    }
    onSubmit?.({
      arrivalTime,
      photoUri,
      gps: draft?.gps || null,
    });
  };

  const displayError = validationError || error;

  return (
    <OperationalFormSheet
      visible={visible}
      onClose={onClose}
      title="On Scene"
      subtitle="Confirm arrival with time, GPS, and on-scene photo"
      icon={MapPin}
      onSubmit={handleSubmit}
      submitLabel="Confirm On Scene"
      submittingLabel="Uploading…"
      isSubmitting={isSubmitting}
      submitDisabled={!photoUri?.trim() || Boolean(validationError)}
      colors={colors}
    >
      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ARRIVAL DATE</Text>
        <Text style={[styles.dateValue, { color: colors.text }]}>
          {formatArrivalDate(selectedAt)}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          Date is set automatically from the on-scene event.
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ARRIVAL TIME</Text>
        {isEditingTime ? (
          <View style={styles.timeEditRow}>
            <TextInput
              ref={timeInputRef}
              value={timeInput}
              onChangeText={(value) => {
                setTimeInput(value);
                setValidationError("");
              }}
              onSubmitEditing={commitTimeInput}
              onBlur={commitTimeInput}
              placeholder="6:24 PM"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              editable={!isSubmitting}
              style={[
                styles.timeInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              accessibilityLabel="Arrival time"
            />
          </View>
        ) : (
          <View style={styles.arrivalRow}>
            <Text style={[styles.arrivalValue, { color: colors.text }]}>
              {formatArrivalTime(selectedAt)}
            </Text>
            <TouchableOpacity
              onPress={startEditingTime}
              disabled={isSubmitting}
              style={[
                styles.editButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit arrival time"
            >
              <Pencil size={14} color={colors.accent} />
              <Text style={[styles.editButtonText, { color: colors.accent }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEditingTime ? (
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Auto-filled from device time. Tap Edit to type a correction.
          </Text>
        ) : (
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Type the arrival time (e.g. 6:20 PM). Date cannot be changed.
          </Text>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LOCATION</Text>
        <View style={styles.gpsRow}>
          {gpsStatus === "captured" ? (
            <>
              <Check size={16} color={colors.accent} />
              <Text style={[styles.gpsText, { color: colors.text }]}>GPS captured</Text>
            </>
          ) : gpsStatus === "pending" ? (
            <Text style={[styles.gpsText, { color: colors.textSecondary }]}>
              Capturing GPS…
            </Text>
          ) : (
            <Text style={[styles.gpsText, { color: colors.textSecondary }]}>
              {gpsError || "GPS unavailable"}
            </Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ON-SCENE PHOTO</Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Required — document the scene as you found it upon arrival.
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

        {acceptedDate ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Must be on or after acceptance ({formatArrivalTime(acceptedDate)}).
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
  dateValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  arrivalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  arrivalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  timeEditRow: {
    marginBottom: spacing.sm,
  },
  timeInput: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  editButton: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gpsText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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
