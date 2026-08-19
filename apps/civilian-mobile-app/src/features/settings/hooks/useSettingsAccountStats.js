import { useCallback, useEffect, useMemo, useState } from "react";
import useUserStore from "@/stores/userStore";
import { UI_MODE, mockData } from "@/services/api";
import { getUserEmergencyReports } from "@packages/firebase";
import { normalizeHistoryReport } from "@/features/history/utils";
import { isActiveReport } from "@/features/history/constants";

export function useSettingsAccountStats() {
  const { user } = useUserStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.uid || user?.id;

  const fetchReports = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setReports(mockData.emergencyList.reports.map(normalizeHistoryReport));
        return;
      }

      if (!userId) return;
      const fetched = await getUserEmergencyReports(userId, 100);
      setReports(fetched.map(normalizeHistoryReport));
    } catch (error) {
      console.error("Settings stats error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return useMemo(() => {
    const safeReports = Array.isArray(reports) ? reports : [];
    const activeCount = safeReports.filter((report) =>
      isActiveReport(report.status)
    ).length;
    const memberSince = user?.created_at
      ? new Date(user.created_at).getFullYear()
      : new Date().getFullYear();

    return {
      loading,
      totalReports: safeReports.length,
      activeCount,
      memberSince,
    };
  }, [reports, user?.created_at, loading]);
}
