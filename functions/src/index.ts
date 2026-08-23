import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import {
  ALARM_SOUND,
  ALERT_CATEGORY,
  ALERT_CHANNEL,
  CIVILIAN_ALERT_CHANNEL,
  loadResponderTokens,
  loadCivilianTokens,
  sendExpoPush,
  type ExpoMessage,
} from './expoPush';

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

/**
 * Priorities that warrant waking a responder's phone while on duty.
 * Low stays in-app only.
 */
const ALARM_PRIORITIES = new Set(['critical', 'high', 'medium']);

/**
 * How long to keep re-sending an unacknowledged alert.
 *
 * "Until acknowledged" is the intent, but an unbounded reminder loop would
 * hammer a phone that is off or out of coverage indefinitely and burn quota, so
 * reminders stop here and the incident is left for the dispatcher to reassign.
 */
const REMINDER_WINDOW_MINUTES = 20;

/** iOS cannot loop a remote sound, so reminders stand in for a continuous alarm. */
const REMINDER_INTERVAL_SECONDS = 60;

type IncidentData = Record<string, any>;

const priorityOf = (incident: IncidentData): string =>
  String(incident?.priority ?? incident?.priorityLevel ?? '').toLowerCase();

const isOpen = (incident: IncidentData): boolean =>
  incident?.status !== 'resolved' &&
  incident?.resolutionStatus !== 'resolved' &&
  incident?.resolutionStatus !== 'cancelled';

/** Skip cases the responder is already working — no need to keep alarming. */
const isStillAssignable = (incident: IncidentData): boolean => {
  const status = String(incident?.status ?? '').toLowerCase();
  return !['enroute', 'on_scene', 'resolved', 'done', 'unresolved'].includes(status);
};

const titleFor = (incident: IncidentData): string => {
  const priority = priorityOf(incident).toUpperCase();
  const type =
    incident?.incidentTypeLabel ||
    incident?.incidentSubtypeLabel ||
    incident?.incidentCategory ||
    'Incident';
  return `${priority ? `${priority} · ` : ''}${type}`;
};

const bodyFor = (incident: IncidentData): string => {
  const place =
    incident?.locationText ||
    incident?.address ||
    incident?.barangay ||
    'Location on map';
  const ref = incident?.referenceNumber ? ` (${incident.referenceNumber})` : '';
  return `Dispatched to you${ref} — ${place}`;
};

const buildMessage = (
  token: string,
  incidentId: string,
  incident: IncidentData,
  isReminder: boolean
): ExpoMessage => ({
  to: token,
  title: isReminder ? `STILL UNACKNOWLEDGED — ${titleFor(incident)}` : titleFor(incident),
  body: bodyFor(incident),
  data: {
    incidentId,
    priority: priorityOf(incident),
    referenceNumber: incident?.referenceNumber ?? null,
    isReminder,
    action: 'incident_alert',
  },
  sound: ALARM_SOUND,
  channelId: ALERT_CHANNEL,
  categoryId: ALERT_CATEGORY,
  priority: 'high',
  // time-sensitive breaks through Focus without the Critical Alerts entitlement.
  interruptionLevel: 'time-sensitive',
  ttl: REMINDER_INTERVAL_SECONDS * 2,
});

/**
 * Fan an alert out to the given responders. Returns how many messages landed.
 * Off-duty responders are dropped inside loadResponderTokens.
 */
async function alertResponders(
  incidentId: string,
  incident: IncidentData,
  responderIds: string[],
  isReminder: boolean
): Promise<number> {
  const targets = await loadResponderTokens(responderIds);
  if (targets.length === 0) {
    logger.info('No on-duty push targets for responders', { incidentId, responderIds });
    return 0;
  }

  const messages: ExpoMessage[] = [];
  const tokenOwners = new Map<string, string>();

  for (const target of targets) {
    for (const entry of target.tokens) {
      tokenOwners.set(entry.token, target.responderId);
      messages.push(buildMessage(entry.token, incidentId, incident, isReminder));
    }
  }

  const { sent, removed } = await sendExpoPush(messages, tokenOwners);
  logger.info('Alert dispatched', { incidentId, isReminder, sent, removed });
  return sent;
}

/**
 * Alert responders the moment they are assigned to an incident.
 *
 * Listens on document writes (both create and update) so:
 * 1. Manual incident intake (create then dispatch update)
 * 2. App & SMS emergency intake (direct elevation to incident with assigned responder)
 * both reliably trigger push notification alarms.
 */
export const onIncidentAssigned = onDocumentWritten(
  'incidents/{incidentId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;

    const incidentId = event.params.incidentId;

    if (!isOpen(after) || !isStillAssignable(after)) return;
    if (!ALARM_PRIORITIES.has(priorityOf(after))) return;

    const previous = new Set<string>(
      Array.isArray(before?.assignedResourceIds) ? before!.assignedResourceIds : []
    );
    const current: string[] = Array.isArray(after.assignedResourceIds)
      ? after.assignedResourceIds
      : [];

    const newlyAssigned = current.filter((id) => id && !previous.has(id));
    if (newlyAssigned.length === 0) return;

    // assignedResourceIds mixes resource ids and responder uids; loadResponderTokens
    // silently drops anything without a dispatchers/{uid} doc carrying tokens,
    // and also drops responders who are not currently on duty.
    await alertResponders(incidentId, after, newlyAssigned, false);

    await event.data!.after.ref.update({
      lastAlertAt: Timestamp.now(),
    });
  }
);

/**
 * Re-alert responders who have not acknowledged yet.
 *
 * This is what makes the alert "repeat until acknowledged" on iOS, where a
 * remote push cannot loop its own sound. Android already loops via its channel,
 * but the reminder also covers a device that was offline at dispatch time.
 * Off-duty responders are skipped.
 */
export const resendUnacknowledgedAlerts = onSchedule(
  {
    // Cloud Scheduler's floor is one minute — this is the fastest reminder
    // cadence available without a self-rescheduling task queue.
    schedule: 'every 1 minutes',
    region: 'asia-southeast1',
  },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.fromMillis(
      Date.now() - REMINDER_WINDOW_MINUTES * 60 * 1000
    );

    // Single-field inequality only: combining this with an `in` on status would
    // demand a composite index, which is an easy thing to forget at deploy time.
    // The status filter happens below instead — the window keeps the set small.
    const snapshot = await db
      .collection('incidents')
      .where('lastAlertAt', '>=', cutoff)
      .limit(50)
      .get();

    if (snapshot.empty) return;

    let reminders = 0;

    for (const doc of snapshot.docs) {
      const incident = doc.data();
      if (!isOpen(incident) || !isStillAssignable(incident)) continue;
      if (!ALARM_PRIORITIES.has(priorityOf(incident))) continue;

      const assigned: string[] = Array.isArray(incident.assignedResourceIds)
        ? incident.assignedResourceIds
        : [];
      const acknowledged = new Set<string>(
        Array.isArray(incident.responderAlertAcknowledgedBy)
          ? incident.responderAlertAcknowledgedBy
          : []
      );

      const pending = assigned.filter((id) => id && !acknowledged.has(id));
      if (pending.length === 0) continue;

      reminders += await alertResponders(doc.id, incident, pending, true);
    }

    if (reminders > 0) {
      logger.info('Reminder sweep complete', { reminders });
    }
  }
);

const formatCivilianNotification = (
  emergency: Record<string, any>,
  beforeStatus?: string
): { title: string; body: string } | null => {
  const currentStatus = String(emergency?.status ?? '').toLowerCase();
  const agency = emergency?.assignedAgency || 'Emergency Services';
  const type = emergency?.incidentType || 'Emergency';

  if (currentStatus === beforeStatus) return null;

  switch (currentStatus) {
    case 'dispatched':
    case 'acknowledged':
      return {
        title: `Help Dispatched · ${agency}`,
        body: `Responders from ${agency} have been dispatched to your ${type} report.`,
      };
    case 'enroute':
      return {
        title: `Responders En Route · ${agency}`,
        body: `Emergency units are currently on the way to your location.`,
      };
    case 'on_scene':
      return {
        title: `Responders On Scene · ${agency}`,
        body: `Emergency personnel have arrived at the scene.`,
      };
    case 'resolved':
      return {
        title: `Emergency Resolved`,
        body: `Your reported ${type} emergency has been resolved by ${agency}.`,
      };
    case 'cancelled':
      return {
        title: `Emergency Cancelled`,
        body: `Your reported ${type} emergency has been cancelled.`,
      };
    default:
      return {
        title: `Emergency Status Update`,
        body: `Your ${type} report status has been updated to: ${currentStatus}.`,
      };
  }
};

/**
 * Notify civilian reporters when their emergency report status changes or responders are dispatched.
 * Works even when civilian app is closed or backgrounded.
 */
export const onEmergencyUpdated = onDocumentUpdated(
  'emergencies/{emergencyId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || !after.userId) return;

    const emergencyId = event.params.emergencyId;
    const beforeStatus = before?.status;
    const notification = formatCivilianNotification(after, beforeStatus);
    if (!notification) return;

    const target = await loadCivilianTokens(after.userId);
    if (!target || target.tokens.length === 0) {
      logger.info('No civilian push tokens found for user', { userId: after.userId, emergencyId });
      return;
    }

    const messages: ExpoMessage[] = target.tokens.map((entry) => ({
      to: entry.token,
      title: notification.title,
      body: notification.body,
      data: {
        emergencyId,
        status: after.status,
        action: 'civilian_emergency_update',
      },
      sound: 'default',
      channelId: CIVILIAN_ALERT_CHANNEL,
      priority: 'high',
      interruptionLevel: 'time-sensitive',
      ttl: 3600,
    }));

    const tokenOwners = new Map<string, string>();
    target.tokens.forEach((entry) => tokenOwners.set(entry.token, after.userId));

    const { sent, removed } = await sendExpoPush(messages, tokenOwners);
    logger.info('Civilian alert sent', { emergencyId, userId: after.userId, sent, removed });
  }
);

