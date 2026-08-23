import React, { memo } from "react";
import { View, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { MapPin } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import {
  canRenderNativeMap,
  getNativeMapProvider,
} from "@/utils/nativeMapConfig";

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
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
      },
      placeholderTitle: {
        marginTop: 8,
        color: t.text,
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        textAlign: "center",
      },
      placeholderText: {
        marginTop: 4,
        color: t.textSecondary,
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        textAlign: "center",
      },
    }),
    reportTheme
  );

  if (!latitude || !longitude) {
    return <View style={[styles.placeholder, styles.map]} />;
  }

  if (!canRenderNativeMap()) {
    return (
      <View style={[styles.placeholder, styles.map]}>
        <MapPin size={22} color={reportTheme.primary} />
        <Text style={styles.placeholderTitle}>Map pin unavailable in this build</Text>
        <Text style={styles.placeholderText}>Type the address or nearest landmark instead.</Text>
      </View>
    );
  }

  return (
    <MapView
      provider={getNativeMapProvider()}
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
