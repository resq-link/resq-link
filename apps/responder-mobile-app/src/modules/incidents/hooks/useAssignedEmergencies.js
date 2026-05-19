import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/query/queryKeys";
import { subscribeAssignedIncidents } from "@/services/incidentService";

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

  const cases = query.data ?? [];

  return {
    ...query,
    cases,
    /** True until the first realtime snapshot for this uid arrives */
    initialSyncPending: !!uid && initialSyncPending,
  };
}
