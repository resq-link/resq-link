import {
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import type { ResourceRecord } from './resources';

/**
 * Responder operational helpers for assigned resources.
 *
 * Resource assignment is owned exclusively by Command Center via
 * `resources/{id}.primaryResponderId`. The mobile app reads that binding
 * through `subscribeToAssignedResource` in resources.ts — responders must
 * never self-select or change their unit.
 */

/** @deprecated Duty claiming removed — use subscribeToAssignedResource instead. */
export type ResponderDutyState = {
  resourceId: string | null;
  since: Date | null;
};

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }
  return currentUser;
};

async function assertOwnsResource(resourceId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  const snap = await getDoc(doc(getFirebaseFirestore(), 'resources', resourceId));
  if (!snap.exists()) {
    throw new Error('Resource not found');
  }
  const data = snap.data();
  const primary =
    data.primaryResponderId || data.assignedResponderId || null;
  if (primary !== currentUser.uid) {
    throw new Error('You can only update your Command Center assigned resource.');
  }
}

/**
 * @deprecated Responders can no longer self-claim vehicles. Assignment is
 * managed from Command Center only.
 */
export async function startResponderDuty(_resourceId: string): Promise<void> {
  throw new Error(
    'Resource assignment is managed by Command Center. Contact your dispatcher.'
  );
}

/**
 * @deprecated Responders can no longer release vehicles from mobile.
 */
export async function endResponderDuty(): Promise<void> {
  throw new Error(
    'Resource assignment is managed by Command Center. Contact your dispatcher.'
  );
}

/**
 * @deprecated Use subscribeToAssignedResource — reads primaryResponderId binding.
 */
export function subscribeToResponderDuty(
  callback: (state: ResponderDutyState) => void
): () => void {
  callback({ resourceId: null, since: null });
  return () => {};
}

/**
 * Push GPS to the responder's Command Center assigned resource.
 * Validates ownership before writing.
 */
export async function updateResourceLocation(
  resourceId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  ensureAuthenticated();
  if (!resourceId) return;

  await assertOwnsResource(resourceId);

  await updateDoc(doc(getFirebaseFirestore(), 'resources', resourceId), {
    currentLatitude: latitude,
    currentLongitude: longitude,
    lastLocationAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/** Whether this responder is the primary (GPS) owner of the resource. */
export function isPrimaryResponder(
  resource: Pick<ResourceRecord, 'primaryResponderId'> | null | undefined,
  responderId: string | null | undefined
): boolean {
  if (!resource || !responderId) return false;
  return resource.primaryResponderId === responderId;
}

/** Crew currently bound to this vehicle (Command Center managed). */
export function getResourceCrewIds(
  resource: Pick<ResourceRecord, 'assignedResponderIds'> | null | undefined
): string[] {
  return resource?.assignedResponderIds?.filter(Boolean) ?? [];
}
