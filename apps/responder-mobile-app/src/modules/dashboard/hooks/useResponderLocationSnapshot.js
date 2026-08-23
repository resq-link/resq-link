import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";

/**
 * One-shot GPS read when the dashboard gains focus — used for distance labels only.
 * Does not replace the continuous tracking hook.
 */
export function useResponderLocationSnapshot(enabled) {
  const [coords, setCoords] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;

      let cancelled = false;

      (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== "granted") return;

          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (!cancelled) {
            setCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        } catch {
          // Distance is optional metadata — ignore location failures.
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [enabled])
  );

  return coords;
}
