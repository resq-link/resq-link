import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import {
  MAX_ESCALATION_LEVEL,
  type IncidentPriority,
  normalizePriority,
  resolvePriorityForIncidentType,
} from './priority';
import { convertFirestoreDoc, type EmergencyReport } from './emergencies';

export type AlertableRecord = Pick<
  EmergencyReport,
  | 'id'
  | 'priority'
  | 'incidentType'
  | 'description'
  | 'alertAcknowledged'
  | 'acknowledgedAt'
  | 'acknowledgedBy'
  | 'escalationLevel'
  | 'lastAlertAt'
  | 'createdAt'
>;

export function isAlertAcknowledged(
  record: Partial<AlertableRecord> & { viewedByName?: string | null }
): boolean {
  return Boolean(
    record.alertAcknowledged ||
      record.acknowledgedBy ||
      record.viewedByName
  );
}

/**
 * Acknowledge a priority alert — stops repeating sounds and records dispatcher ack.
 */
export async function acknowledgeEmergencyAlert(
  reportId: string,
  dispatcherName: string
): Promise<EmergencyReport> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to acknowledge alerts');
  }

  const label = dispatcherName.trim() || currentUser.email || currentUser.uid;
  const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
  const now = Timestamp.now();

  await updateDoc(reportRef, {
    alertAcknowledged: true,
    acknowledgedAt: now,
    acknowledgedBy: label,
    acknowledgedByDispatcherId: currentUser.uid,
    viewedByDispatcherId: currentUser.uid,
    viewedByName: label,
    viewedAt: now,
    lastAlertAt: now,
    updatedAt: now,
  });

  const updatedDocSnap = await getDoc(reportRef);
  if (!updatedDocSnap.exists()) {
    throw new Error('Emergency report not found after acknowledgment');
  }

  return convertFirestoreDoc(updatedDocSnap);
}

/**
 * Dispatcher manual priority override.
 */
export async function updateEmergencyPriority(
  reportId: string,
  priority: IncidentPriority
): Promise<EmergencyReport> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to update priority');
  }

  const normalized = normalizePriority(priority);
  const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);

  await updateDoc(reportRef, {
    priority: normalized,
    priorityLevel: normalized,
    updatedAt: Timestamp.now(),
  });

  const updatedDocSnap = await getDoc(reportRef);
  if (!updatedDocSnap.exists()) {
    throw new Error('Emergency report not found after priority update');
  }

  return convertFirestoreDoc(updatedDocSnap);
}

export type EscalationUpdateResult = {
  applied: boolean;
  escalationLevel: number;
  supervisorNotified?: boolean;
  autoEscalated?: boolean;
};

/**
 * Apply the next escalation step for an unacknowledged critical/high emergency.
 * Idempotent per escalation level — will not loop past MAX_ESCALATION_LEVEL.
 */
export async function applyEmergencyEscalationStep(
  reportId: string,
  targetLevel: number
): Promise<EscalationUpdateResult> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to escalate alerts');
  }

  const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new Error('Emergency report not found');
  }

  const data = snap.data();
  const currentLevel =
    typeof data.escalationLevel === 'number' ? data.escalationLevel : 0;

  if (data.alertAcknowledged || data.acknowledgedBy || data.viewedByName) {
    return { applied: false, escalationLevel: currentLevel };
  }

  const nextLevel = Math.min(MAX_ESCALATION_LEVEL, Math.max(currentLevel, targetLevel));
  if (nextLevel <= currentLevel) {
    return { applied: false, escalationLevel: currentLevel };
  }

  const patch: Record<string, unknown> = {
    escalationLevel: nextLevel,
    lastAlertAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (nextLevel >= 2 && !data.supervisorNotifiedAt) {
    patch.supervisorNotifiedAt = Timestamp.now();
  }

  if (nextLevel >= 3) {
    patch.priority = 'critical';
    patch.priorityLevel = 'critical';
    patch.autoEscalatedAt = Timestamp.now();
    if (!data.status || data.status === 'pending') {
      patch.status = 'active';
    }
  }

  await updateDoc(reportRef, patch);

  return {
    applied: true,
    escalationLevel: nextLevel,
    supervisorNotified: nextLevel >= 2,
    autoEscalated: nextLevel >= 3,
  };
}

export function shouldPlayPriorityAlert(
  report: Partial<AlertableRecord>,
  isMuted: boolean
): boolean {
  if (isMuted) return false;
  if (isAlertAcknowledged(report)) return false;
  const priority = normalizePriority(
    report.priority,
    resolvePriorityForIncidentType(report.incidentType || 'other_emergency', {
      description: report.description,
    })
  );
  return priority === 'critical' || priority === 'high' || priority === 'medium' || priority === 'low';
}
