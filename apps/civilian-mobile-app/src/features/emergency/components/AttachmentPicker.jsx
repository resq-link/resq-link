import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function UploadCard({ icon: Icon, label, onPress, styles, reportTheme }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.uploadCard, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.uploadIcon}>
        <Icon size={26} color={reportTheme.primary} strokeWidth={2.2} />
      </View>
      <Text style={styles.uploadLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AttachmentPicker({
  imageUris,
  onTakePhoto,
  onPickGallery,
  onRemove,
}) {
  const { reportTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      heading: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.title,
        color: t.text,
        marginBottom: 8,
      },
      subheading: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
      },
      uploadRow: {
        flexDirection: "row",
        gap: 12,
      },
      uploadCard: {
        flex: 1,
        minHeight: 120,
        borderRadius: 20,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        shadowColor: t.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3,
      },
      pressed: {
        opacity: 0.88,
        transform: [{ scale: 0.98 }],
      },
      uploadIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: t.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
      },
      uploadLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.body,
        color: t.text,
      },
      gallery: {
        marginTop: 22,
      },
      galleryLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption + 1,
        color: t.textSecondary,
        marginBottom: 12,
      },
      thumbRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
      },
      thumbWrap: {
        width: 88,
        height: 88,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: t.surface,
      },
      thumb: {
        width: "100%",
        height: "100%",
      },
      removeBtn: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
      },
      addMore: {
        width: 88,
        height: 88,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.surface,
      },
    }),
    reportTheme
  );

  return (
    <View>
      <Text style={styles.heading}>Photos</Text>
      <Text style={styles.subheading}>
        Add photos if safe to do so. Skip if you need to move quickly.
      </Text>

      <View style={styles.uploadRow}>
        <UploadCard icon={Camera} label="Camera" onPress={onTakePhoto} styles={styles} reportTheme={reportTheme} />
        <UploadCard icon={ImagePlus} label="Gallery" onPress={onPickGallery} styles={styles} reportTheme={reportTheme} />
      </View>

      {imageUris.length > 0 ? (
        <View style={styles.gallery}>
          <Text style={styles.galleryLabel}>
            {imageUris.length} photo{imageUris.length === 1 ? "" : "s"} attached
          </Text>
          <View style={styles.thumbRow}>
            {imageUris.map((uri) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => onRemove(uri)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <X size={14} color={reportTheme.text} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
            {imageUris.length < 6 ? (
              <Pressable
                style={styles.addMore}
                onPress={onPickGallery}
                accessibilityRole="button"
                accessibilityLabel="Add more photos"
              >
                <ImagePlus size={22} color={reportTheme.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
