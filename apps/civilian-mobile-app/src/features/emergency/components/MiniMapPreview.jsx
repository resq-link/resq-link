import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function MiniMapPreview({ latitude, longitude, mapRegion, onPin, interactive = false }) {
  const { reportTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      map: {
        width: "100%",
        height: 140,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: t.surface,
      },
      placeholder: {
        backgroundColor: t.surface,
      },
    }),
    reportTheme
  );

  if (!latitude || !longitude) {
    return <View style={[styles.placeholder, styles.map]} />;
  }

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      region={mapRegion}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      onPress={interactive ? (e) => onPin?.(e.nativeEvent.coordinate) : undefined}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        draggable={interactive}
        onDragEnd={interactive ? (e) => onPin?.(e.nativeEvent.coordinate) : undefined}
        pinColor={reportTheme.primary}
      />
    </MapView>
  );
}

export default memo(MiniMapPreview);
