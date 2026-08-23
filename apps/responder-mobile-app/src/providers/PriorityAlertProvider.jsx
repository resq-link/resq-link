import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "expo-router";
import useUserStore from "@/store/userStore";
import { useAssignedEmergencies } from "@/modules/incidents/hooks/useAssignedEmergencies";
import {
  PRIORITY_RANK,
  acknowledgeIncidentAlert,
  normalizePriority,
  requiresForcedAlert,
} from "@packages/firebase";
import {
  playPriorityAlert,
  releaseAlertResources,
  stopPriorityAlerts,
  shouldAlertForIncident,
} from "@/services/priorityAlertService";
import {
  dismissIncidentNotifications,
  registerForIncidentPush,
  unregisterIncidentPush,
} from "@/services/pushNotificationService";
import IncidentAlertModal from "@/modules/incidents/components/IncidentAlertModal";

const IncidentAlertContext = createContext({
  activeAlert: null,
  acknowledge: async () => {},
  isAcknowledging: false,
});

export const useIncidentAlert = () => useContext(IncidentAlertContext);

/**
 * Drives the assignment alarm: haptics, looping sound, and the blocking
 * acknowledge sheet.
 *
 * State-driven rather than event-driven on purpose. The alarm reflects "is
 * there an unacknowledged incident assigned to me right now", so it also
 * resumes correctly after an app restart or a reconnect — an alert that goes
 * quiet because the process died is exactly the failure this feature exists to
 * prevent.
 */
export default function PriorityAlertProvider({ children }) {
  const { user } = useUserStore();
  const pathname = usePathname();
  const { cases } = useAssignedEmergencies(user?.uid);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const alarmingIdRef = useRef(null);

  // Register this device for remote push while a responder is signed in.
  // Token removal is handled by the sign-out effect below, not by cleanup here,
  // so a re-render never detaches a still-signed-in device.
  useEffect(() => {
    if (!user?.uid) return;
    void registerForIncidentPush().catch(() => {});
  }, [user?.uid]);

  const viewingIncidentId = useMemo(() => {
    const match = typeof pathname === "string" ? pathname.match(/\/incident\/([^/?#]+)/) : null;
    const id = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!id || id === "undefined" || id === "null") return null;
    return id;
  }, [pathname]);

  /** Unacknowledged, still-open incidents assigned to this responder. */
  const alertingCases = useMemo(() => {
    if (!user?.uid) return [];
    return cases
      .filter((c) => c.resolutionStatus === "open" && c.status !== "resolved")
      .filter((c) => c.id && shouldAlertForIncident(c, user.uid))
      // Don't cover the case detail screen with the same incident's alarm sheet.
      .filter((c) => c.id !== viewingIncidentId)
      .sort(
        (a, b) =>
          (PRIORITY_RANK[normalizePriority(b.priority)] ?? 0) -
          (PRIORITY_RANK[normalizePriority(a.priority)] ?? 0)
      );
  }, [cases, user?.uid, viewingIncidentId]);

  const activeAlert = alertingCases[0] ?? null;

  // Start, switch, or stop the alarm as the top unacknowledged incident changes.
  useEffect(() => {
    if (!user?.uid || !activeAlert) {
      if (alarmingIdRef.current) {
        alarmingIdRef.current = null;
        void stopPriorityAlerts();
      }
      return;
    }

    if (alarmingIdRef.current === activeAlert.id) return;

    alarmingIdRef.current = activeAlert.id;
    const priority = normalizePriority(activeAlert.priority);
    void playPriorityAlert(priority, {
      intensified: requiresForcedAlert(priority),
    });
  }, [activeAlert, user?.uid]);

  // Signing out must silence the device and detach its push token.
  useEffect(() => {
    if (user?.uid) return;
    alarmingIdRef.current = null;
    void stopPriorityAlerts();
    void unregisterIncidentPush();
  }, [user?.uid]);

  useEffect(() => () => releaseAlertResources(), []);

  const acknowledge = useCallback(async () => {
    const incidentId = activeAlert?.id;
    if (!incidentId) return;

    setIsAcknowledging(true);
    // Silence immediately — the responder has demonstrably seen it, and waiting
    // on the network round-trip would keep the alarm going for no reason.
    alarmingIdRef.current = null;
    await stopPriorityAlerts();

    try {
      await acknowledgeIncidentAlert(incidentId);
      void dismissIncidentNotifications(incidentId);
    } catch (error) {
      // The write failed, so the snapshot will still list this incident as
      // unacknowledged and the alarm will resume on the next tick. That is the
      // right outcome: an unrecorded acknowledgement should not stay silent.
      alarmingIdRef.current = null;
      console.warn("[alert] Failed to acknowledge:", error?.message ?? error);
    } finally {
      setIsAcknowledging(false);
    }
  }, [activeAlert?.id]);

  const value = useMemo(
    () => ({ activeAlert, acknowledge, isAcknowledging }),
    [activeAlert, acknowledge, isAcknowledging]
  );

  return (
    <IncidentAlertContext.Provider value={value}>
      {children}
      <IncidentAlertModal
        incident={activeAlert}
        onAcknowledge={acknowledge}
        isAcknowledging={isAcknowledging}
      />
    </IncidentAlertContext.Provider>
  );
}
