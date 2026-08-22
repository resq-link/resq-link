import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const LOADING_TIMEOUT_MS = 8000;

export function useMapScreen({ focusReportId: _focusReportId } = {}) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [reportError] = useState(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isOffline] = useState(false);
  const [lastUpdatedAt] = useState(null);

  const locationWatchRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      setHasTimedOut(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setHasTimedOut(true);
      setLoading(false);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setHasTimedOut(false);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    const startLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setLocationError("Location permission denied");
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            accuracy: current.coords.accuracy,
          });
          setLocationUpdatedAt(new Date());
          setLocationError(null);
        }

        locationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
            timeInterval: 8000,
          },
          (position) => {
            if (cancelled) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            setLocationUpdatedAt(new Date());
          }
        );
      } catch (error) {
        if (!cancelled) {
          setLocationError(error.message || "Unable to get location");
        }
      }
    };

    startLocation();

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove?.();
    };
  }, []);

  // Live incident tracking is disabled for civilians — resources mode only.
  const isIncidentMode = false;
  const liveReport = null;

  const recenterToUser = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
      };
      setUserLocation(coord);
      setLocationUpdatedAt(new Date());
      setLocationError(null);
      return coord;
    } catch {
      return userLocation;
    }
  }, [userLocation]);

  return {
    loading,
    refreshing,
    refresh,
    userLocation,
    locationUpdatedAt,
    locationError,
    reportError,
    dataError: reportError,
    hasTimedOut,
    isOffline,
    lastUpdatedAt,
    isIncidentMode,
    liveReport,
    recenterToUser,
  };
}
