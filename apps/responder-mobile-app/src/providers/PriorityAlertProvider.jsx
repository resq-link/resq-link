import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import useUserStore from "@/store/userStore";
import { useAssignedEmergencies } from "@/modules/incidents/hooks/useAssignedEmergencies";
import {
  PRIORITY_RANK,
  acknowledgeIncidentAlert,
  normalizePriority,
  requiresForcedAlert,
  subscribeToResponderDuty,
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
  subscribeToIncidentNotificationActions,
  unregisterIncidentPush,
} from "@/services/pushNotificationService";
import IncidentAlertModal from "@/modules/incidents/components/IncidentAlertModal";

const IncidentAlertContext = createContext({
  activeAlert: null,
  acknowledge: async () => {},
  isAcknowledging: false,
  isOnDuty: false,
});

export const useIncidentAlert = () => useContext(IncidentAlertContext);

/**
 * Drives the assignment alarm: push registration, haptics, looping sound, and
 * the blocking acknowledge sheet.
 *
 * Alerts only fire while the responder is on duty (has claimed a resource).
 * State-driven rather than event-driven so an unacknowledged assignment still
 * resumes after an app restart or reconnect.
 */
export default function PriorityAlertProvider({ children }) {
  const { user } = useUserStore();
  const pathname = usePathname();
  const router = useRouter();
  const { cases } = useAssignedEmergencies(user?.uid);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const alarmingIdRef = useRef(null);

  // Live duty gate — off-duty phones must stay quiet even if still assigned.
  useEffect(() => {
    if (!user?.uid) {
      setIsOnDuty(false);
      return undefined;
    }
    return subscribeToResponderDuty((duty) => {
      setIsOnDuty(Boolean(duty?.resourceId));
    });
  }, [user?.uid]);

  // Register this device for remote push while a responder is signed in.
  // Token removal is handled by the sign-out effect below, not by cleanup here,
  // so a re-render never detaches a still-signed-in device.
  useEffect(() => {
    if (!user?.uid) return;
    void registerForIncidentPush().catch(() => {});
  }, [user?.uid]);

  // Tray Acknowledge / View actions (and cold-start notification taps).
  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToIncidentNotificationActions({
      onView: (incidentId) => {
        if (!incidentId) return;
        router.push(`/incident/${incidentId}`);
      },
    });
  }, [user?.uid, router]);

  const viewingIncidentId = useMemo(() => {
    const match = typeof pathname === "string" ? pathname.match(/\/incident\/([^/?#]+)/) : null;
    const id = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!id || id === "undefined" || id === "null") return null;
    return id;
  }, [pathname]);

  /** Unacknowledged, still-open incidents assigned to this on-duty responder. */
  const alertingCases = useMemo(() => {
    if (!user?.uid || !isOnDuty) return [];
    return cases
      .filter((c) => c.resolutionStatus === "open" && c.status !== "resolved")
      .filter((c) => c.id && shouldAlertForIncident(c, user.uid, { isOnDuty: true }))
      // Don't cover the case detail screen with the same incident's alarm sheet.
      .filter((c) => c.id !== viewingIncidentId)
      .sort(
        (a, b) =>
          (PRIORITY_RANK[normalizePriority(b.priority)] ?? 0) -
          (PRIORITY_RANK[normalizePriority(a.priority)] ?? 0)
      );
  }, [cases, user?.uid, viewingIncidentId, isOnDuty]);

  const activeAlert = alertingCases[0] ?? null;

  // Start, switch, or stop the alarm as the top unacknowledged incident changes.
  useEffect(() => {
    if (!user?.uid || !isOnDuty || !activeAlert) {
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
  }, [activeAlert, user?.uid, isOnDuty]);

  // Going off duty must silence immediately.
  useEffect(() => {
    if (isOnDuty) return;
    alarmingIdRef.current = null;
    void stopPriorityAlerts();
    void dismissIncidentNotifications();
  }, [isOnDuty]);

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
    () => ({ activeAlert, acknowledge, isAcknowledging, isOnDuty }),
    [activeAlert, acknowledge, isAcknowledging, isOnDuty]
  );

  return (
    <IncidentAlertContext.Provider value={value}>
      {children}
      {isOnDuty ? (
        <IncidentAlertModal
          incident={activeAlert}
          onAcknowledge={acknowledge}
          isAcknowledging={isAcknowledging}
        />
      ) : null}
    </IncidentAlertContext.Provider>
  );
}
