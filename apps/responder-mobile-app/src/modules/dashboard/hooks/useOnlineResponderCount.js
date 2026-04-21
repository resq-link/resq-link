import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/query/queryKeys";
import { subscribeOnlineResponderCount } from "@/services/responderService";

/**
 * Live responder count from RTDB / Firestore fallback, cached in React Query.
 */
export function useOnlineResponderCount(enabled) {
  const queryClient = useQueryClient();
  const [initialSyncPending, setInitialSyncPending] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setInitialSyncPending(false);
      return;
    }
    setInitialSyncPending(true);
    const unsubscribe = subscribeOnlineResponderCount((count) => {
      queryClient.setQueryData(queryKeys.responders.onlineCount, count);
      setInitialSyncPending(false);
    });
    return unsubscribe;
  }, [enabled, queryClient]);

  const query = useQuery({
    queryKey: queryKeys.responders.onlineCount,
    queryFn: () => Promise.resolve(0),
    enabled,
    staleTime: Infinity,
  });

  return {
    count: query.data ?? 0,
    initialSyncPending: enabled && initialSyncPending,
    ...query,
  };
}
