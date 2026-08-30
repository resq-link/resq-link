import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import useUserStore from "@/store/userStore";
import { queryKeys } from "@/query/queryKeys";
import { useAssignedEmergencies } from "@/modules/incidents/hooks/useAssignedEmergencies";
import {
  PRIORITY_RANK,
  normalizePriority,
  requiresForcedAlert,
  subscribeToAssignedResource,
  isResponderAssignmentPendingAccept,
} from "@packages/firebase";
import { acknowledgeIncidentCase } from "@/services/incidentService";
import {
  playPriorityAlert,
  releaseAlertResources,
  stopPriorityAlerts,
  shouldAlertForIncident,
} from "@/services/priorityAlertService";
import {
  loadNotificationSettings,
  subscribeNotificationSettings,
} from "@/services/notificationSettingsService";
import {
  dismissIncidentNotifications,
  registerForIncidentPush,
  subscribeToIncidentNotificationActions,
  unregisterIncidentPush,
} from "@/services/pushNotificationService";
import { toast } from "@/utils/toast";
import IncidentAlertModal from "@/modules/incidents/components/IncidentAlertModal";

const IncidentAlertContext = createContext({
  activeAlert: null,
  alertingCount: 0,
  acknowledge: async () => {},
  isAcknowledging: false,
  isOnDuty: false,
});

export const useIncidentAlert = () => useContext(IncidentAlertContext);

/**
 * Drives the assignment alarm: push registration, haptics, looping sound, and
 * the blocking acknowledge sheet.
 *
 * Alerts fire when the responder has an incident assignment pending acknowledgement,
 * or a Command Center assigned resource. Assignment in Firestore is authoritative;
 * resource binding supplements on-duty detection for crew members.
 * State-driven rather than event-driven so an unacknowledged assignment still
 * resumes after an app restart or reconnect.
 */
export default function PriorityAlertProvider({ children }) {
  const { user } = useUserStore();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cases } = useAssignedEmergencies(user?.uid);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [hasAssignedResource, setHasAssignedResource] = useState(false);
  const [settingsTick, setSettingsTick] = useState(0);
  const alarmingIdRef = useRef(null);

  useEffect(() => {
    void loadNotificationSettings();
    return subscribeNotificationSettings(() => setSettingsTick((n) => n + 1));
  }, []);

  // Require a Command Center resource assignment before alarming.
  useEffect(() => {
    if (!user?.uid) {
      setHasAssignedResource(false);
      return undefined;
    }
    return subscribeToAssignedResource((resource) => {
      setHasAssignedResource(Boolean(resource?.id));
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

  /** Assigned on incident docs — works even without a primary resource binding. */
  const hasIncidentAssignment = useMemo(() => {
    if (!user?.uid) return false;
    return cases.some(
      (c) =>
        c.resolutionStatus === "open" &&
        c.status !== "resolved" &&
        (c.assignedResourceIds?.includes(user.uid) ||
          Boolean(c.responderAssignments?.[user.uid]) ||
          isResponderAssignmentPendingAccept(c, user.uid))
    );
  }, [cases, user?.uid]);

  const canReceiveAlerts = hasAssignedResource || hasIncidentAssignment;

  /** Incidents that should alarm (includes case on screen until Acknowledge). */
  const alarmingCases = useMemo(() => {
    if (!user?.uid || !canReceiveAlerts) return [];
    return cases
      .filter((c) => c.resolutionStatus === "open" && c.status !== "resolved")
      .filter((c) => c.id && shouldAlertForIncident(c, user.uid, { isOnDuty: true }))
      .sort(
        (a, b) =>
          (PRIORITY_RANK[normalizePriority(b.priority)] ?? 0) -
          (PRIORITY_RANK[normalizePriority(a.priority)] ?? 0)
      );
  }, [cases, user?.uid, canReceiveAlerts, settingsTick]);

  const modalCases = useMemo(
    () => alarmingCases.filter((c) => c.id !== viewingIncidentId),
    [alarmingCases, viewingIncidentId]
  );

  const alarmTarget = alarmingCases[0] ?? null;
  const activeAlert = modalCases[0] ?? null;
  const alertingCount = alarmingCases.length;

  // Start, switch, or stop the alarm as the top unacknowledged incident changes.
  useEffect(() => {
    if (!user?.uid || !canReceiveAlerts || !alarmTarget) {
      if (alarmingIdRef.current) {
        alarmingIdRef.current = null;
        void stopPriorityAlerts();
      }
      return;
    }

    if (alarmingIdRef.current === alarmTarget.id) return;

    alarmingIdRef.current = alarmTarget.id;
    const priority = normalizePriority(alarmTarget.priority);
    void playPriorityAlert(priority, {
      intensified: requiresForcedAlert(priority),
    });
  }, [alarmTarget, user?.uid, canReceiveAlerts]);

  // No assigned resource and no incident work — silence immediately.
  useEffect(() => {
    if (canReceiveAlerts) return;
    alarmingIdRef.current = null;
    void stopPriorityAlerts();
    void dismissIncidentNotifications();
  }, [canReceiveAlerts]);

  // Signing out must silence the device and detach its push token.
  useEffect(() => {
    if (user?.uid) return;
    alarmingIdRef.current = null;
    void stopPriorityAlerts();
    void unregisterIncidentPush();
  }, [user?.uid]);

  useEffect(() => () => releaseAlertResources(), []);

  const acknowledge = useCallback(async () => {
    const incidentId = alarmTarget?.id ?? activeAlert?.id;
    if (!incidentId) return;

    setIsAcknowledging(true);

    try {
      const updated = await acknowledgeIncidentCase(incidentId);
      alarmingIdRef.current = null;
      await stopPriorityAlerts();

      if (user?.uid) {
        queryClient.setQueryData(queryKeys.incidents.assigned(user.uid), (prev) => {
          if (!Array.isArray(prev)) return prev;
          const hasMatch = prev.some((item) => item.id === incidentId);
          if (!hasMatch) return prev;
          return prev.map((item) =>
            item.id === incidentId ? { ...item, ...updated, id: incidentId } : item
          );
        });
      }

      void dismissIncidentNotifications(incidentId);
      toast.success("Incident accepted — en route");
    } catch (error) {
      console.warn("[alert] Failed to acknowledge and accept:", error?.message ?? error);
      toast.error(error?.message || "Could not accept incident. Try again.");
      throw error;
    } finally {
      setIsAcknowledging(false);
    }
  }, [alarmTarget?.id, activeAlert?.id, queryClient, user?.uid]);

  const value = useMemo(
    () => ({
      activeAlert,
      alertingCount,
      acknowledge,
      isAcknowledging,
      isOnDuty: canReceiveAlerts,
    }),
    [activeAlert, alertingCount, acknowledge, isAcknowledging, canReceiveAlerts]
  );

  return (
    <IncidentAlertContext.Provider value={value}>
      {children}
      {activeAlert ? (
        <IncidentAlertModal
          incident={activeAlert}
          onAcknowledge={acknowledge}
          isAcknowledging={isAcknowledging}
        />
      ) : null}
    </IncidentAlertContext.Provider>
  );
}
