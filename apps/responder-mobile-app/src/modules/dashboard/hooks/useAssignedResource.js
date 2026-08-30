import { useEffect, useState } from "react";
import { subscribeToAssignedResource } from "@packages/firebase";

/**
 * Read-only view of the resource Command Center assigned to this responder.
 * Resolves via Firestore `primaryResponderId == authenticated UID`.
 */
export function useAssignedResource(userId) {
  const [assignedResource, setAssignedResource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setAssignedResource(null);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToAssignedResource(
      (resource) => {
        setAssignedResource(resource);
        setIsLoading(false);
      },
      {
        onError: (err) => {
          console.error("Failed to load assigned resource:", err);
          setError(err?.message || "Could not load assigned resource.");
          setIsLoading(false);
        },
      }
    );

    return unsubscribe;
  }, [userId]);

  return {
    assignedResource,
    hasAssignedResource: Boolean(assignedResource),
    isLoading,
    error,
  };
}
