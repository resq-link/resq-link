import {
  Timestamp,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import type { ResourceRecord, ResourceStatus } from './resources';

/**
 * Responder duty: which vehicle a responder is crewing right now.
 *
 * A responder going on duty claims a resource (ambulance, fire truck, …). The
 * first to claim becomes `primaryResponderId` and their phone's GPS becomes
 * that vehicle's position on the dispatcher map; anyone joining afterwards is
 * crew. Releasing promotes the next crew member, so a vehicle only goes dark
 * once the last person steps off.
 *
 * Duty state is mirrored on the responder's `dispatchers/{uid}` document so a
 * client can restore it on launch with a single listener.
 */

export type ResponderDutyState = {
  resourceId: string | null;
  since: Date | null;
};

/** Statuses that reflect availability rather than an active job. */
const IDLE_STATUSES: ResourceStatus[] = ['available', 'offline'];

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to change duty status');
  }
  return currentUser;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
};

/**
 * The resource-document changes for a responder stepping off a vehicle.
 *
 * Only flips an idle vehicle to `offline`; a resource mid-incident keeps its
 * operational status. Current coordinates are cleared when the last crew member
 * leaves so the map falls back to the station rather than showing a phantom
 * unit parked wherever the phone last reported.
 */
const buildReleaseUpdate = (data: DocumentData, uid: string) => {
  const crew: string[] = (Array.isArray(data.assignedResponderIds)
    ? data.assignedResponderIds
    : []
  ).filter((id: string) => id && id !== uid);

  const wasPrimary = data.primaryResponderId === uid;
  const nextPrimary = wasPrimary ? crew[0] ?? null : data.primaryResponderId ?? null;
  const status: ResourceStatus = data.status ?? 'offline';
  const nowEmpty = crew.length === 0;

  return {
    assignedResponderIds: crew,
    primaryResponderId: nextPrimary,
    assignedResponderId: nextPrimary,
    status: nowEmpty && IDLE_STATUSES.includes(status) ? 'offline' : status,
    ...(nowEmpty
      ? { currentLatitude: null, currentLongitude: null, lastLocationAt: null }
      : {}),
    updatedAt: Timestamp.now(),
  };
};

/**
 * Go on duty against a resource, releasing any previously held one.
 *
 * Runs in a transaction because two responders can reach for the same vehicle
 * at once and only one may end up primary.
 */
export async function startResponderDuty(resourceId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  const trimmedId = resourceId.trim();
  if (!trimmedId) throw new Error('A resource must be selected.');

  const db = getFirebaseFirestore();
  const resourceRef = doc(db, 'resources', trimmedId);
  const dispatcherRef = doc(db, 'dispatchers', currentUser.uid);

  await runTransaction(db, async (transaction) => {
    // Every read must happen before any write inside a transaction.
    const dispatcherSnap = await transaction.get(dispatcherRef);
    const previousId: string | null =
      dispatcherSnap.exists() && dispatcherSnap.data()?.onDutyResourceId
        ? dispatcherSnap.data()!.onDutyResourceId
        : null;

    const previousRef =
      previousId && previousId !== trimmedId
        ? doc(db, 'resources', previousId)
        : null;
    const previousSnap = previousRef ? await transaction.get(previousRef) : null;

    const resourceSnap = await transaction.get(resourceRef);
    if (!resourceSnap.exists()) {
      throw new Error('That resource no longer exists.');
    }

    const data = resourceSnap.data();
    if (data.isActive === false) {
      throw new Error(`${data.name || 'That resource'} is not in service.`);
    }
    if (data.status === 'maintenance') {
      throw new Error(`${data.name || 'That resource'} is under maintenance.`);
    }

    if (previousRef && previousSnap?.exists()) {
      transaction.update(previousRef, buildReleaseUpdate(previousSnap.data(), currentUser.uid));
    }

    const crew: string[] = Array.isArray(data.assignedResponderIds)
      ? data.assignedResponderIds
      : [];
    const nextCrew = crew.includes(currentUser.uid) ? crew : [...crew, currentUser.uid];
    const primary = data.primaryResponderId || currentUser.uid;
    const status: ResourceStatus = data.status ?? 'offline';

    transaction.update(resourceRef, {
      assignedResponderIds: nextCrew,
      primaryResponderId: primary,
      assignedResponderId: primary,
      // Coming out of offline means the vehicle is crewed and dispatchable.
      status: status === 'offline' ? 'available' : status,
      updatedAt: Timestamp.now(),
    });

    transaction.update(dispatcherRef, {
      onDutyResourceId: trimmedId,
      onDutySince: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

/** Step off the current vehicle. Safe to call when not on duty. */
export async function endResponderDuty(): Promise<void> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const dispatcherRef = doc(db, 'dispatchers', currentUser.uid);

  await runTransaction(db, async (transaction) => {
    const dispatcherSnap = await transaction.get(dispatcherRef);
    const resourceId: string | null =
      dispatcherSnap.exists() && dispatcherSnap.data()?.onDutyResourceId
        ? dispatcherSnap.data()!.onDutyResourceId
        : null;

    const resourceRef = resourceId ? doc(db, 'resources', resourceId) : null;
    const resourceSnap = resourceRef ? await transaction.get(resourceRef) : null;

    if (resourceRef && resourceSnap?.exists()) {
      transaction.update(
        resourceRef,
        buildReleaseUpdate(resourceSnap.data(), currentUser.uid)
      );
    }

    transaction.update(dispatcherRef, {
      onDutyResourceId: null,
      onDutySince: null,
      updatedAt: Timestamp.now(),
    });
  });
}

/** Live duty state for the signed-in responder. */
export function subscribeToResponderDuty(
  callback: (state: ResponderDutyState) => void
): () => void {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    callback({ resourceId: null, since: null });
    return () => {};
  }

  return onSnapshot(
    doc(getFirebaseFirestore(), 'dispatchers', currentUser.uid),
    (snapshot) => {
      const data = snapshot.data();
      callback({
        resourceId: data?.onDutyResourceId ?? null,
        since: toDate(data?.onDutySince),
      });
    },
    (error) => {
      console.error('Error subscribing to responder duty:', error);
      callback({ resourceId: null, since: null });
    }
  );
}

/**
 * Push the crewed vehicle's position.
 *
 * Takes the resource id rather than looking it up so the caller — a GPS watcher
 * firing every few seconds — does not incur a read per update. Only the primary
 * responder should call this; crew phones would otherwise fight over the
 * vehicle's position.
 */
export async function updateResourceLocation(
  resourceId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  ensureAuthenticated();
  if (!resourceId) return;

  await updateDoc(doc(getFirebaseFirestore(), 'resources', resourceId), {
    currentLatitude: latitude,
    currentLongitude: longitude,
    lastLocationAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/** Is this responder the one whose GPS drives the vehicle's position? */
export function isPrimaryResponder(
  resource: Pick<ResourceRecord, 'primaryResponderId'> | null | undefined,
  responderId: string | null | undefined
): boolean {
  if (!resource || !responderId) return false;
  return resource.primaryResponderId === responderId;
}

/** Crew currently signed on to this vehicle. */
export function getResourceCrewIds(
  resource: Pick<ResourceRecord, 'assignedResponderIds'> | null | undefined
): string[] {
  return resource?.assignedResponderIds?.filter(Boolean) ?? [];
}
