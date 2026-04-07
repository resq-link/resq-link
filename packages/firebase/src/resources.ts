import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { normalizeQuadrant, type OperationalQuadrant } from './quadrants';

export type ResourceType =
  | 'AMBULANCE'
  | 'BFP'
  | 'PNP'
  | 'MDRRMO'
  | 'PCG'
  | 'OTHER';

export type ResourceStatus =
  | 'available'
  | 'assigned'
  | 'en_route'
  | 'on_scene'
  | 'maintenance'
  | 'offline';

export interface ResourceRecord {
  id?: string;
  name: string;
  resourceCode?: string | null;
  type: ResourceType;
  customType?: string | null;
  agency?: string | null;
  department?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  status: ResourceStatus;
  stationName?: string | null;
  quadrant?: OperationalQuadrant | null;
  stationLatitude?: number | null;
  stationLongitude?: number | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  assignedResponderId?: string | null;
  assignedIncidentId?: string | null;
  notes?: string | null;
  isActive?: boolean;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

const convertFirestoreDoc = (snapshot: DocumentData): ResourceRecord => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || '',
    resourceCode: data.resourceCode || null,
    type: data.type || 'OTHER',
    customType: data.customType || null,
    agency: data.agency || null,
    department: data.department || null,
    teamId: data.teamId || null,
    teamName: data.teamName || null,
    status: data.status || 'available',
    stationName: data.stationName || null,
    quadrant: normalizeQuadrant(data.quadrant),
    stationLatitude: data.stationLatitude ?? null,
    stationLongitude: data.stationLongitude ?? null,
    currentLatitude: data.currentLatitude ?? null,
    currentLongitude: data.currentLongitude ?? null,
    assignedResponderId: data.assignedResponderId || null,
    assignedIncidentId: data.assignedIncidentId || null,
    notes: data.notes || null,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
  };
};

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage resources');
  }
  return currentUser;
};

const normalizeNullableString = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeNullableNumber = (value?: number | null): number | null => {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return value;
};

const normalizeResourceInput = (
  resource: Omit<ResourceRecord, 'id' | 'createdAt' | 'updatedAt'>
) => ({
  name: resource.name.trim(),
  resourceCode: normalizeNullableString(resource.resourceCode),
  type: resource.type,
  customType: resource.type === 'OTHER' ? normalizeNullableString(resource.customType) : null,
  agency: normalizeNullableString(resource.agency),
  department: normalizeNullableString(resource.department),
  teamId: normalizeNullableString(resource.teamId),
  teamName: normalizeNullableString(resource.teamName),
  status: resource.status,
  stationName: normalizeNullableString(resource.stationName),
  quadrant: normalizeQuadrant(resource.quadrant),
  stationLatitude: normalizeNullableNumber(resource.stationLatitude),
  stationLongitude: normalizeNullableNumber(resource.stationLongitude),
  currentLatitude: normalizeNullableNumber(resource.currentLatitude),
  currentLongitude: normalizeNullableNumber(resource.currentLongitude),
  assignedResponderId: normalizeNullableString(resource.assignedResponderId),
  assignedIncidentId: normalizeNullableString(resource.assignedIncidentId),
  notes: normalizeNullableString(resource.notes),
  isActive: resource.isActive !== false,
});

export async function createResource(
  resource: Omit<ResourceRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ResourceRecord> {
  try {
    ensureAuthenticated();
    if (!resource.name.trim()) {
      throw new Error('Resource name is required');
    }

    const resourcesRef = collection(getFirebaseFirestore(), 'resources');
    const payload = {
      ...normalizeResourceInput(resource),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(resourcesRef, payload);
    return {
      ...payload,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error: any) {
    console.error('Error creating resource:', error);
    throw new Error(`Failed to create resource: ${error.message}`);
  }
}

export async function updateResource(
  resourceId: string,
  updates: Partial<Omit<ResourceRecord, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ResourceRecord> {
  try {
    ensureAuthenticated();
    const resourceRef = doc(getFirebaseFirestore(), 'resources', resourceId);
    const existing = await getDoc(resourceRef);

    if (!existing.exists()) {
      throw new Error('Resource not found');
    }

    const normalizedUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) normalizedUpdates.name = updates.name.trim();
    if (updates.resourceCode !== undefined) normalizedUpdates.resourceCode = normalizeNullableString(updates.resourceCode);
    if (updates.type !== undefined) normalizedUpdates.type = updates.type;
    if (updates.customType !== undefined) normalizedUpdates.customType = normalizeNullableString(updates.customType);
    if (updates.agency !== undefined) normalizedUpdates.agency = normalizeNullableString(updates.agency);
    if (updates.department !== undefined) normalizedUpdates.department = normalizeNullableString(updates.department);
    if (updates.teamId !== undefined) normalizedUpdates.teamId = normalizeNullableString(updates.teamId);
    if (updates.teamName !== undefined) normalizedUpdates.teamName = normalizeNullableString(updates.teamName);
    if (updates.status !== undefined) normalizedUpdates.status = updates.status;
    if (updates.stationName !== undefined) normalizedUpdates.stationName = normalizeNullableString(updates.stationName);
    if (updates.quadrant !== undefined) normalizedUpdates.quadrant = normalizeQuadrant(updates.quadrant);
    if (updates.stationLatitude !== undefined) normalizedUpdates.stationLatitude = normalizeNullableNumber(updates.stationLatitude);
    if (updates.stationLongitude !== undefined) normalizedUpdates.stationLongitude = normalizeNullableNumber(updates.stationLongitude);
    if (updates.currentLatitude !== undefined) normalizedUpdates.currentLatitude = normalizeNullableNumber(updates.currentLatitude);
    if (updates.currentLongitude !== undefined) normalizedUpdates.currentLongitude = normalizeNullableNumber(updates.currentLongitude);
    if (updates.assignedResponderId !== undefined) normalizedUpdates.assignedResponderId = normalizeNullableString(updates.assignedResponderId);
    if (updates.assignedIncidentId !== undefined) normalizedUpdates.assignedIncidentId = normalizeNullableString(updates.assignedIncidentId);
    if (updates.notes !== undefined) normalizedUpdates.notes = normalizeNullableString(updates.notes);
    if (updates.isActive !== undefined) normalizedUpdates.isActive = updates.isActive;
    if (updates.type === 'OTHER' && updates.customType === undefined) {
      normalizedUpdates.customType = existing.data().customType || null;
    }
    if (updates.type !== undefined && updates.type !== 'OTHER') {
      normalizedUpdates.customType = null;
    }

    normalizedUpdates.updatedAt = Timestamp.now();

    await updateDoc(resourceRef, normalizedUpdates);

    const updated = await getDoc(resourceRef);
    if (!updated.exists()) {
      throw new Error('Resource not found after update');
    }

    return convertFirestoreDoc(updated);
  } catch (error: any) {
    console.error('Error updating resource:', error);
    throw new Error(`Failed to update resource: ${error.message}`);
  }
}

export async function deleteResource(resourceId: string): Promise<void> {
  try {
    ensureAuthenticated();
    await deleteDoc(doc(getFirebaseFirestore(), 'resources', resourceId));
  } catch (error: any) {
    console.error('Error deleting resource:', error);
    throw new Error(`Failed to delete resource: ${error.message}`);
  }
}

export async function getAllResources(limitCount: number = 300): Promise<ResourceRecord[]> {
  try {
    ensureAuthenticated();
    const resourcesRef = collection(getFirebaseFirestore(), 'resources');
    const q = query(resourcesRef, orderBy('updatedAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertFirestoreDoc).filter((resource) => resource.isActive !== false);
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }
}

function isPermissionDenied(error: any): boolean {
  const code = error?.code
  const message = (error?.message ?? '').toLowerCase()
  return (
    code === 'permission-denied' ||
    message.includes('missing or insufficient permissions') ||
    message.includes('insufficient permissions') ||
    message.includes('permission denied')
  )
}

export function subscribeToResources(
  callback: (resources: ResourceRecord[]) => void,
  limitCount: number = 300
): () => void {
  try {
    // Avoid permission errors during auth initialization races.
    // If the user isn't authenticated yet, don't start the listener.
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const resourcesRef = collection(getFirebaseFirestore(), 'resources');
    const q = query(resourcesRef, orderBy('updatedAt', 'desc'), limit(limitCount));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const resources = snapshot.docs
          .map(convertFirestoreDoc)
          .filter((resource) => resource.isActive !== false);
        callback(resources);
      },
      (error) => {
        // Avoid console spam for expected auth/rules failures.
        if (isPermissionDenied(error)) {
          callback([]);
          return
        }
        console.error('Error subscribing to resources:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up resources subscription:', error);
    return () => {};
  }
}
