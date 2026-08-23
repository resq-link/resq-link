import { useCallback, useEffect, useMemo, useState } from "react";
import useUserStore from "@/stores/userStore";
import { appDebug } from "@/utils/logger";
import { UI_MODE, mockData } from "@/services/api";
import { getUserEmergencyReports, normalizeOperationalStatus } from "@packages/firebase";
import {
  filterReports,
  normalizeHistoryReport,
  searchReports,
  groupReportsByTimeline,
} from "@/features/history/utils";
import { isActiveReport } from "@/features/history/constants";

export function useHistoryReports() {
  const { user } = useUserStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const userId = user?.uid || user?.id;

  const fetchReports = useCallback(async () => {
    if (!user) return;

    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        appDebug("UI MODE: Using mock history data");
        setReports(mockData.emergencyList.reports.map(normalizeHistoryReport));
        return;
      }

      const resolvedUserId = user.uid || user.id;
      if (!resolvedUserId) {
        console.error("User ID not found");
        return;
      }

      const fetched = await getUserEmergencyReports(resolvedUserId, 100);
      setReports(fetched.map(normalizeHistoryReport));
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId, fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const processed = useMemo(() => {
    const searched = searchReports(reports, searchQuery);
    const filtered = filterReports(searched, statusFilter, typeFilter);
    const sections = groupReportsByTimeline(filtered);

    const activeCount = reports.filter((r) => isActiveReport(r.status)).length;
    const resolvedCount = reports.filter((r) => {
      const norm = normalizeOperationalStatus(r.status);
      return norm === "resolved" || r.status === "done" || r.status === "completed";
    }).length;
    const pendingCount = reports.filter((r) => {
      const norm = normalizeOperationalStatus(r.status);
      return norm === "pending";
    }).length;

    return {
      sections,
      totalCount: filtered.length,
      stats: {
        total: reports.length,
        active: activeCount,
        resolved: resolvedCount,
        pending: pendingCount,
      },
    };
  }, [reports, searchQuery, statusFilter, typeFilter]);

  return {
    loading,
    refreshing,
    onRefresh,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sections: processed.sections,
    totalCount: processed.totalCount,
    stats: processed.stats,
    isEmpty: !loading && reports.length === 0,
    isFilteredEmpty:
      !loading && reports.length > 0 && processed.totalCount === 0,
  };
}
