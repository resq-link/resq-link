import { useEffect } from "react";
import * as Location from "expo-location";
import {
  pushDispatcherLocation,
  setDispatcherPresenceOnline,
} from "@/services/responderService";

/**
 * When `shouldTrack` is true (signed-in dispatcher, Firebase session present, location not paused),
 * push GPS to Firestore and mark the dispatcher online (matches previous `dashboard.jsx` behavior).
 */
export function useDashboardLocationTracking(shouldTrack) {
  useEffect(() => {
    if (!shouldTrack) return;

    let locationSubscription = null;
    let locationUpdateInterval = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        await setDispatcherPresenceOnline(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await pushDispatcherLocation(
          location.coords.latitude,
          location.coords.longitude
        );

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          async (loc) => {
            try {
              await pushDispatcherLocation(
                loc.coords.latitude,
                loc.coords.longitude
              );
            } catch (e) {
              console.error("Error updating location:", e);
            }
          }
        );

        locationUpdateInterval = setInterval(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            await pushDispatcherLocation(loc.coords.latitude, loc.coords.longitude);
          } catch (e) {
            console.error("Error updating location:", e);
          }
        }, 60000);
      } catch (e) {
        console.error("Error setting up location tracking:", e);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
      setDispatcherPresenceOnline(false).catch(console.error);
    };
  }, [shouldTrack]);
}
