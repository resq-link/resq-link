import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import useUserStore from "@/stores/userStore";
import { UI_MODE, mockData } from "@/services/api";
import { getUserEmergencyReports, subscribeToEmergencyReport } from "@packages/firebase";
import { isActiveReport } from "@/features/history/constants";
import { normalizeHistoryReport } from "@/features/history/utils";
import { loadMapCache, saveMapCache } from "@/features/incident-map/utils/mapCache";

const LOADING_TIMEOUT_MS = 8000;

export function useMapScreen({ focusReportId } = {}) {
  const { user } = useUserStore();
  const userId = user?.uid || user?.id;
  const resolvedFocusId =
    typeof focusReportId === "string" && focusReportId.length > 0
      ? focusReportId
      : null;

  const [activeReportMeta, setActiveReportMeta] = useState(null);
  const [liveReport, setLiveReport] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const locationWatchRef = useRef(null);
  const cacheHydratedRef = useRef(false);
  const cacheStateRef = useRef({
    liveReport: null,
    activeReportMeta: null,
  });

  useEffect(() => {
    cacheStateRef.current = {
      liveReport,
      activeReportMeta,
    };
  }, [activeReportMeta, liveReport]);

  const writeCache = useCallback((overrides = {}) => {
    saveMapCache({
      ...cacheStateRef.current,
      ...overrides,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadMapCache().then((cached) => {
      if (cancelled || !cached || cacheHydratedRef.current) return;
      cacheHydratedRef.current = true;

      if (cached.liveReport) {
        setLiveReport(cached.liveReport);
      }
      if (cached.activeReportMeta) {
        setActiveReportMeta(cached.activeReportMeta);
      }
      if (cached.savedAt) {
        setLastUpdatedAt(cached.savedAt);
      }
      if (cached.liveReport) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const fetchActiveReport = useCallback(async () => {
    if (resolvedFocusId) {
      if (UI_MODE) {
        const mockActive = mockData.emergencyList.reports.find((r) =>
          isActiveReport(r.status)
        );
        if (mockActive) {
          setActiveReportMeta({
            ...normalizeHistoryReport({
              ...mockActive,
              id: resolvedFocusId,
              latitude: 17.6145,
              longitude: 121.7275,
              incident_id: "inc-mock-1",
              priority: "high",
            }),
            id: resolvedFocusId,
            latitude: 17.6145,
            longitude: 121.7275,
            priority: "high",
          });
        } else {
          setActiveReportMeta({ id: resolvedFocusId });
        }
      } else {
        setActiveReportMeta({ id: resolvedFocusId });
      }
      setReportError(null);
      return;
    }

    if (!user) return;

    try {
      if (UI_MODE) {
        const mockActive = mockData.emergencyList.reports.find((r) =>
          isActiveReport(r.status)
        );
        if (mockActive) {
          setActiveReportMeta({
            ...normalizeHistoryReport({
              ...mockActive,
              latitude: 17.6145,
              longitude: 121.7275,
              incident_id: "inc-mock-1",
              priority: "high",
            }),
            latitude: 17.6145,
            longitude: 121.7275,
            priority: "high",
          });
        } else {
          setActiveReportMeta(null);
        }
        setReportError(null);
        return;
      }

      if (!userId) return;
      const reports = await getUserEmergencyReports(userId, 25);
      const active = reports.find((report) => isActiveReport(report.status));
      if (active) {
        setActiveReportMeta({
          ...normalizeHistoryReport(active),
          ...active,
        });
      } else {
        setActiveReportMeta(null);
      }
      setReportError(null);
      setIsOffline(false);
    } catch (error) {
      setReportError(error.message || "Couldn't load active report");
      setIsOffline(true);
    }
  }, [user, userId, resolvedFocusId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setReportError(null);
    setHasTimedOut(false);
    await fetchActiveReport();
    setRefreshing(false);
    setLoading(false);
  }, [fetchActiveReport]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeReportMeta?.id || UI_MODE) {
      if (UI_MODE && activeReportMeta) {
        setLiveReport({
          ...activeReportMeta,
          latitude: 17.6145,
          longitude: 121.7275,
          priority: "high",
          createdAt: activeReportMeta.createdAt,
          viewedAt: new Date(Date.now() - 120000),
        });
      } else {
        setLiveReport(null);
      }
      return undefined;
    }

    return subscribeToEmergencyReport(
      activeReportMeta.id,
      (report) => {
        if (!report) {
          setLiveReport(null);
          return;
        }
        const normalized = {
          ...normalizeHistoryReport(report),
          ...report,
        };
        setLiveReport(normalized);
        setReportError(null);
        setLastUpdatedAt(new Date().toISOString());
        setIsOffline(false);
        writeCache({ liveReport: normalized, activeReportMeta });
      },
      {
        onError: (error) => {
          setReportError(error.message || "Couldn't load incident report");
          setIsOffline(true);
        },
      }
    );
  }, [activeReportMeta, writeCache]);

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

  const isIncidentMode = Boolean(
    liveReport && isActiveReport(liveReport.status)
  );

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
