import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged, getFirebaseAuth } from "@packages/firebase";
import { queryKeys } from "@/query/queryKeys";
import { subscribeOnlineResponderCount } from "@/services/responderService";

/**
 * Live responder count from RTDB / Firestore fallback, cached in React Query.
 * Waits for Firebase Auth before subscribing so Firestore rules see a signed-in user
 * (Zustand can restore session from AsyncStorage before auth persistence finishes).
 */
export function useOnlineResponderCount(enabled) {
  const queryClient = useQueryClient();
  const [initialSyncPending, setInitialSyncPending] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState(
    () => getFirebaseAuth().currentUser?.uid ?? null
  );
  const [authResolved, setAuthResolved] = useState(
    () => !!getFirebaseAuth().currentUser
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setFirebaseUid(user?.uid ?? null);
      setAuthResolved(true);
    });
    return unsub;
  }, []);

  const canSubscribe = enabled && authResolved && !!firebaseUid;

  useEffect(() => {
    if (!enabled) {
      setInitialSyncPending(false);
      return;
    }
    if (!authResolved) {
      setInitialSyncPending(true);
      return;
    }
    if (!firebaseUid) {
      setInitialSyncPending(false);
      queryClient.setQueryData(queryKeys.responders.onlineCount, 0);
      return;
    }
    setInitialSyncPending(true);
    const unsubscribe = subscribeOnlineResponderCount((count) => {
      queryClient.setQueryData(queryKeys.responders.onlineCount, count);
      setInitialSyncPending(false);
    });
    return unsubscribe;
  }, [enabled, authResolved, firebaseUid, queryClient]);

  const query = useQuery({
    queryKey: queryKeys.responders.onlineCount,
    queryFn: () => Promise.resolve(0),
    enabled: canSubscribe,
    staleTime: Infinity,
  });

  return {
    count: query.data ?? 0,
    initialSyncPending: enabled && initialSyncPending,
    ...query,
  };
}
