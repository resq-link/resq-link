import { useEffect, useRef } from "react";
import useUserStore from "@/store/userStore";
import { useAssignedEmergencies } from "@/modules/incidents/hooks/useAssignedEmergencies";
import {
  normalizePriority,
  requiresForcedAlert,
} from "@packages/firebase";
import {
  playPriorityAlert,
  stopPriorityAlerts,
  shouldAlertForIncident,
} from "@/services/priorityAlertService";

/**
 * Plays tiered haptic alerts when new assigned incidents arrive (responder field ops).
 */
export default function PriorityAlertProvider({ children }) {
  const { user } = useUserStore();
  const { cases } = useAssignedEmergencies(user?.uid);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!user?.uid) {
      stopPriorityAlerts();
      seenIdsRef.current = new Set();
      initialLoadRef.current = true;
      return;
    }

    const openCases = cases.filter(
      (c) => c.resolutionStatus === "open" && c.status !== "resolved"
    );

    if (!initialLoadRef.current) {
      openCases.forEach((incident) => {
        if (!incident.id || seenIdsRef.current.has(incident.id)) return;
        if (!shouldAlertForIncident(incident)) return;
        seenIdsRef.current.add(incident.id);
        const priority = normalizePriority(incident.priority);
        void playPriorityAlert(priority, {
          intensified: requiresForcedAlert(priority),
        });
      });
    } else {
      initialLoadRef.current = false;
    }

    openCases.forEach((c) => {
      if (c.id) seenIdsRef.current.add(c.id);
    });

    const needsRepeat = openCases.some((c) => shouldAlertForIncident(c));
    if (!needsRepeat) {
      stopPriorityAlerts();
    }
  }, [cases, user?.uid]);

  useEffect(() => () => stopPriorityAlerts(), []);

  return children;
}
