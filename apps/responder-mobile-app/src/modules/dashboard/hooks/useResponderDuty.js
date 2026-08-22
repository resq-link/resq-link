import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endResponderDuty,
  isPrimaryResponder,
  startResponderDuty,
  subscribeToResources,
  subscribeToResponderDuty,
} from "@packages/firebase";

/**
 * Which vehicle this responder is crewing, plus the list they can choose from.
 *
 * The resource list is the shared `subscribeToResources` feed filtered to units
 * that are actually claimable: in service and not under maintenance. Already
 * crewed vehicles stay in the list so a second responder can join as crew —
 * they are just labelled with who is on board.
 */
export function useResponderDuty(userId) {
  const [duty, setDuty] = useState({ resourceId: null, since: null });
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setDuty({ resourceId: null, since: null });
      return undefined;
    }
    return subscribeToResponderDuty(setDuty);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setResources([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToResources(
      (items) => {
        setResources(items);
        setIsLoading(false);
      },
      300,
      {
        onError: (err) => {
          console.error("Failed to load resources:", err);
          setIsLoading(false);
        },
      }
    );
    return unsubscribe;
  }, [userId]);

  const activeResource = useMemo(
    () => resources.find((item) => item.id === duty.resourceId) ?? null,
    [resources, duty.resourceId]
  );

  const claimableResources = useMemo(
    () =>
      resources
        .filter((item) => item.isActive !== false && item.status !== "maintenance")
        .sort((left, right) => {
          // Unclaimed units first, then alphabetical — the common case is
          // taking an empty vehicle, not joining a crew.
          const leftCrew = left.assignedResponderIds?.length ?? 0;
          const rightCrew = right.assignedResponderIds?.length ?? 0;
          if (leftCrew === 0 !== (rightCrew === 0)) return leftCrew === 0 ? -1 : 1;
          return (left.name || "").localeCompare(right.name || "");
        }),
    [resources]
  );

  const isPrimary = isPrimaryResponder(activeResource, userId);

  const goOnDuty = useCallback(async (resourceId) => {
    setIsSaving(true);
    setError("");
    try {
      await startResponderDuty(resourceId);
      return true;
    } catch (err) {
      setError(err?.message || "Could not go on duty.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const goOffDuty = useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      await endResponderDuty();
      return true;
    } catch (err) {
      setError(err?.message || "Could not go off duty.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    duty,
    activeResource,
    claimableResources,
    isPrimary,
    isLoading,
    isSaving,
    error,
    clearError: () => setError(""),
    goOnDuty,
    goOffDuty,
  };
}
