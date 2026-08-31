import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  waitForFirebaseAuthUser,
  updateResourceLocation,
} from "@packages/firebase";
import {
  pushDispatcherLocation,
  setDispatcherPresenceOnline,
} from "@/services/responderService";
import { useAssignedResource } from "@/modules/dashboard/hooks/useAssignedResource";
import useUserStore from "@/store/userStore";

const LOCATION_PAUSED_KEY = "@resq_responder_location_paused";
const LocationContext = createContext(null);

export function useResponderLocationContext() {
  return useContext(LocationContext);
}

export default function ResponderLocationProvider({ children }) {
  const { user } = useUserStore();
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [locationPaused, setLocationPaused] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const { assignedResource } = useAssignedResource(firebaseUid);
  const vehicleRef = useRef(null);
  vehicleRef.current = assignedResource;

  // Resolve Firebase Auth UID
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setFirebaseUid(null);
        return;
      }
      try {
        const fbUser = await waitForFirebaseAuthUser();
        if (!cancelled && fbUser) {
          setFirebaseUid(fbUser.uid);
        }
      } catch (e) {
        console.error("[ResponderLocationProvider] Error resolving Firebase Auth:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Read location pause preference from AsyncStorage
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LOCATION_PAUSED_KEY).then((val) => {
      if (!cancelled) {
        setLocationPaused(val === "true");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Main continuous location publisher
  useEffect(() => {
    const shouldTrack = Boolean(user && firebaseUid && !locationPaused);
    if (!shouldTrack) {
      setIsTracking(false);
      return;
    }

    let locationSubscription = null;
    let pollInterval = null;
    let isCancelled = false;

    const publishLocation = async (latitude, longitude) => {
      if (isCancelled || !latitude || !longitude) return;
      setCurrentCoords({ latitude, longitude });

      try {
        await pushDispatcherLocation(latitude, longitude);
      } catch (e) {
        console.error("[ResponderLocationProvider] Failed to push GPS:", e);
      }

      const vehicle = vehicleRef.current;
      if (vehicle?.id) {
        try {
          await updateResourceLocation(vehicle.id, latitude, longitude);
        } catch (e) {
          console.error("[ResponderLocationProvider] Failed to update vehicle location:", e);
        }
      }
    };

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || isCancelled) {
          console.warn("[ResponderLocationProvider] Location permission not granted");
          return;
        }

        setIsTracking(true);
        await setDispatcherPresenceOnline(true);

        // Immediate initial fix
        const initialFix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (initialFix?.coords) {
          await publishLocation(
            initialFix.coords.latitude,
            initialFix.coords.longitude
          );
        }

        // Real-time movement watcher (10m delta or 5s)
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          async (loc) => {
            if (loc?.coords) {
              await publishLocation(
                loc.coords.latitude,
                loc.coords.longitude
              );
            }
          }
        );

        // Fallback periodic heartbeat every 5 seconds
        pollInterval = setInterval(async () => {
          try {
            const pollFix = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            if (pollFix?.coords) {
              await publishLocation(
                pollFix.coords.latitude,
                pollFix.coords.longitude
              );
            }
          } catch (e) {
            console.error("[ResponderLocationProvider] Interval poll error:", e);
          }
        }, 5000);
      } catch (e) {
        console.error("[ResponderLocationProvider] Error initializing tracking:", e);
      }
    };

    startTracking();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setDispatcherPresenceOnline(true).catch(() => {});
      }
    });

    return () => {
      isCancelled = true;
      setIsTracking(false);
      if (locationSubscription) locationSubscription.remove();
      if (pollInterval) clearInterval(pollInterval);
      appStateSub.remove();
      setDispatcherPresenceOnline(false).catch(() => {});
    };
  }, [user, firebaseUid, locationPaused]);

  return (
    <LocationContext.Provider
      value={{
        isTracking,
        currentCoords,
        locationPaused,
        setLocationPaused,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
