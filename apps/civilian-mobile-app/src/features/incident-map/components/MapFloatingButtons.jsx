import React, { memo } from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import { Crosshair } from "lucide-react-native";

function MapFloatingButtons({ theme, bottomOffset, onRecenter }) {
  return (
    <Pressable
      onPress={onRecenter}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: bottomOffset,
          backgroundColor: theme.sheetBg ?? theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow ?? "#000000",
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Center map on my location"
    >
      <Crosshair size={20} color={theme.text} strokeWidth={2.2} />
    </Pressable>
  );
}

export default memo(MapFloatingButtons);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    zIndex: 27,
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.14 : 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
