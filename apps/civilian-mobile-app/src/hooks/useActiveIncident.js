import { useState, useEffect } from "react";
import useUserStore from "@/stores/userStore";
import { UI_MODE, mockData } from "@/services/api";
import {
  subscribeToUserEmergencies,
  getUserEmergencyReports,
} from "@packages/firebase";
import { isActiveReport } from "@/features/history/constants";
import { normalizeHistoryReport } from "@/features/history/utils";

/**
 * Hook to subscribe in real-time to the current civilian user's active emergency report.
 * Returns the active incident if any, or null if no active incident is in progress.
 */
export function useActiveIncident() {
  const { user } = useUserStore();
  const [activeIncident, setActiveIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.uid || user?.id;

  useEffect(() => {
    if (!userId) {
      setActiveIncident(null);
      setIsLoading(false);
      return;
    }

    if (UI_MODE) {
      const active =
        mockData.emergencyList.reports
          .map(normalizeHistoryReport)
          .find((r) => isActiveReport(r.status)) || null;
      setActiveIncident(active);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToUserEmergencies(
      userId,
      (reports) => {
        const normalized = reports.map(normalizeHistoryReport);
        const active = normalized.find((r) => isActiveReport(r.status)) || null;
        setActiveIncident(active);
        setIsLoading(false);
      },
      {
        limitCount: 20,
        onError: (err) => {
          console.warn("[useActiveIncident] subscription error, falling back to one-time fetch:", err);
          getUserEmergencyReports(userId, 20)
            .then((reports) => {
              const normalized = reports.map(normalizeHistoryReport);
              const active = normalized.find((r) => isActiveReport(r.status)) || null;
              setActiveIncident(active);
            })
            .catch((fetchErr) => {
              console.error("[useActiveIncident] fetch error:", fetchErr);
            })
            .finally(() => {
              setIsLoading(false);
            });
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return {
    activeIncident,
    hasActiveIncident: Boolean(activeIncident),
    isLoading,
  };
}

export default useActiveIncident;
