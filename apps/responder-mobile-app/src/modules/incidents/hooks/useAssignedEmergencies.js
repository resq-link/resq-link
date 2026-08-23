import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/query/queryKeys";
import { subscribeAssignedIncidents } from "@/services/incidentService";
import { comparePriority, normalizePriority } from "@packages/firebase";

const ASSIGNED_OPTS = { statusFilter: "all", limitCount: 100 };

/**
 * Real-time assigned incidents for a dispatcher, synced into React Query.
 * Initial snapshot completion is tracked separately from `useQuery.isLoading`
 * so the UI can match the prior “wait for first Firebase callback” behavior.
 *
 * @param {string | undefined} uid Firebase dispatcher uid
 * @param {{ onRealtimeSnapshot?: () => void }} [options]
 */
export function useAssignedEmergencies(uid, options = {}) {
  const { onRealtimeSnapshot } = options;
  const onSnapshotRef = useRef(onRealtimeSnapshot);
  onSnapshotRef.current = onRealtimeSnapshot;
  const queryClient = useQueryClient();
  const [initialSyncPending, setInitialSyncPending] = useState(false);

  const queryKey = uid
    ? queryKeys.incidents.assigned(uid)
    : ["incidents", "assigned", "__none__"];

  useEffect(() => {
    if (!uid) {
      setInitialSyncPending(false);
      return;
    }
    setInitialSyncPending(true);
    const unsubscribe = subscribeAssignedIncidents(
      uid,
      (reports) => {
        queryClient.setQueryData(queryKeys.incidents.assigned(uid), reports);
        setInitialSyncPending(false);
        onSnapshotRef.current?.();
      },
      ASSIGNED_OPTS
    );
    return unsubscribe;
  }, [uid, queryClient]);

  const query = useQuery({
    queryKey,
    queryFn: () => Promise.resolve([]),
    enabled: !!uid,
    staleTime: Infinity,
  });

  const getIncidentTimestamp = (item) => {
    if (!item) return 0;
    const raw = item.createdAt || item.assignedAt || item.updatedAt || item.lastAlertAt || item.incidentDate;
    if (!raw) return 0;
    if (typeof raw?.toDate === "function") return raw.toDate().getTime();
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) return parsed;
    }
    if (typeof raw?._seconds === "number") return raw._seconds * 1000;
    if (typeof raw?.seconds === "number") return raw.seconds * 1000;
    return 0;
  };

  const isResolvedStatus = (status) => {
    const s = String(status || "").toLowerCase();
    return s === "resolved" || s === "done" || s === "cancelled" || s === "unresolved";
  };

  const cases = [...(query.data ?? [])].sort((a, b) => {
    // 1. Active / Pending / Open cases come before resolved cases
    const aResolved = isResolvedStatus(a.status || a.resolutionStatus);
    const bResolved = isResolvedStatus(b.status || b.resolutionStatus);
    if (aResolved !== bResolved) {
      return aResolved ? 1 : -1;
    }

    // 2. Newest incidents first (highest timestamp at the top)
    const aTime = getIncidentTimestamp(a);
    const bTime = getIncidentTimestamp(b);
    if (bTime !== aTime) {
      return bTime - aTime;
    }

    // 3. Tiebreak by priority if timestamps match
    return comparePriority(
      normalizePriority(a.priority),
      normalizePriority(b.priority)
    );
  });

  return {
    ...query,
    cases,
    /** True until the first realtime snapshot for this uid arrives */
    initialSyncPending: !!uid && initialSyncPending,
  };
}
