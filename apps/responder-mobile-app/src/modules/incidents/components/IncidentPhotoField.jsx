import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon, X } from "lucide-react-native";
import { radii, spacing } from "@/theme";

function FieldLabel({ label, hint, colors }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

export default function IncidentPhotoField({
  label,
  hint,
  noun,
  uri,
  onChange,
  disabled = false,
  colors,
}) {
  const pickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  };

  const handlePick = useCallback(
    async (source) => {
      if (disabled) return;

      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          source === "camera"
            ? `Camera access is needed to take a ${noun}.`
            : `Photo library access is needed to attach a ${noun}.`,
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets?.[0]?.uri) {
        onChange(result.assets[0].uri);
      }
    },
    [disabled, noun, onChange],
  );

  return (
    <View style={styles.fieldContainer}>
      <FieldLabel label={label} hint={hint} colors={colors} />
      {uri ? (
        <View style={styles.photoPreviewWrap}>
          <Image
            source={{ uri }}
            style={styles.photoPreview}
            contentFit="contain"
            accessibilityLabel={`Selected ${noun} preview`}
          />
          <TouchableOpacity
            onPress={() => onChange("")}
            disabled={disabled}
            style={[
              styles.removePhotoButton,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              disabled && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${noun}`}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoActionsRow}>
          <TouchableOpacity
            onPress={() => handlePick("camera")}
            disabled={disabled}
            style={[
              styles.photoActionButton,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              disabled && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Take ${noun}`}
          >
            <Camera size={18} color={colors.accent} />
            <Text style={[styles.photoActionText, { color: colors.text }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePick("library")}
            disabled={disabled}
            style={[
              styles.photoActionButton,
              { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              disabled && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${noun} from library`}
          >
            <ImageIcon size={18} color={colors.accent} />
            <Text style={[styles.photoActionText, { color: colors.text }]}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  photoActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  photoActionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  photoActionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  photoPreviewWrap: {
    position: "relative",
    borderRadius: radii.md,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
  },
  removePhotoButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
