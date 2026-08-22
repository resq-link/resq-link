import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { updateResourceLocation } from "@packages/firebase";
import {
  pushDispatcherLocation,
  setDispatcherPresenceOnline,
} from "@/services/responderService";

/**
 * When `shouldTrack` is true (signed-in dispatcher, Firebase session present, location not paused),
 * push GPS to Firestore and mark the dispatcher online (matches previous `dashboard.jsx` behavior).
 *
 * When the responder is on duty as the primary crew member, the same fix also
 * updates their vehicle's position, which is what the dispatcher map tracks.
 * Crew members other than the primary do not write, so two phones never fight
 * over one ambulance's location.
 *
 * @param shouldTrack   whether to run the GPS watcher at all
 * @param vehicleTarget `{ resourceId, isPrimary }` for the crewed vehicle, if any
 */
export function useDashboardLocationTracking(shouldTrack, vehicleTarget) {
  // Held in a ref so changing vehicle mid-shift does not tear down and restart
  // the GPS watcher — the next fix simply lands on the new resource.
  const vehicleRef = useRef(vehicleTarget);
  vehicleRef.current = vehicleTarget;

  useEffect(() => {
    if (!shouldTrack) return;

    let locationSubscription = null;
    let locationUpdateInterval = null;

    const publish = async (latitude, longitude) => {
      await pushDispatcherLocation(latitude, longitude);

      const target = vehicleRef.current;
      if (target?.resourceId && target.isPrimary) {
        try {
          await updateResourceLocation(target.resourceId, latitude, longitude);
        } catch (e) {
          // A failed vehicle update must not stop responder presence updates.
          console.error("Error updating vehicle location:", e);
        }
      }
    };

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        await setDispatcherPresenceOnline(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await publish(location.coords.latitude, location.coords.longitude);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 50,
          },
          async (loc) => {
            try {
              await publish(loc.coords.latitude, loc.coords.longitude);
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
            await publish(loc.coords.latitude, loc.coords.longitude);
          } catch (e) {
            console.error("Error updating location:", e);
          }
        }, 5000);
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
