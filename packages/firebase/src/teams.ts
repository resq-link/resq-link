import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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

export interface TeamRecord {
  id?: string;
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage teams');
  }
  return currentUser;
};

const normalizeNullableString = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const convertFirestoreDoc = (snapshot: DocumentData): TeamRecord => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    code: data.code || snapshot.id,
    label: data.label || data.code || snapshot.id,
    description: data.description || null,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
  };
};

export async function createTeam(
  team: Omit<TeamRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TeamRecord> {
  ensureAuthenticated();
  if (!team.code.trim()) {
    throw new Error('Team code is required');
  }
  if (!team.label.trim()) {
    throw new Error('Team label is required');
  }

  const teamsRef = collection(getFirebaseFirestore(), 'teams');
  const payload = {
    code: team.code.trim(),
    label: team.label.trim(),
    description: normalizeNullableString(team.description),
    isActive: team.isActive !== false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(teamsRef, payload);
  return {
    ...payload,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Omit<TeamRecord, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  ensureAuthenticated();
  const teamRef = doc(getFirebaseFirestore(), 'teams', teamId);
  const payload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (updates.code !== undefined) payload.code = updates.code.trim();
  if (updates.label !== undefined) payload.label = updates.label.trim();
  if (updates.description !== undefined) payload.description = normalizeNullableString(updates.description);
  if (updates.isActive !== undefined) payload.isActive = updates.isActive;

  await updateDoc(teamRef, payload);
}

export async function deleteTeam(teamId: string): Promise<void> {
  ensureAuthenticated();
  await deleteDoc(doc(getFirebaseFirestore(), 'teams', teamId));
}

export async function getAllTeams(limitCount: number = 50): Promise<TeamRecord[]> {
  ensureAuthenticated();
  const teamsRef = collection(getFirebaseFirestore(), 'teams');
  const q = query(teamsRef, orderBy('label', 'asc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertFirestoreDoc).filter((team) => team.isActive !== false);
}

function isPermissionDenied(error: any): boolean {
  const code = error?.code;
  const message = (error?.message ?? '').toLowerCase();
  return (
    code === 'permission-denied' ||
    message.includes('missing or insufficient permissions') ||
    message.includes('insufficient permissions') ||
    message.includes('permission denied')
  );
}

export function subscribeToTeams(
  callback: (teams: TeamRecord[]) => void,
  limitCount: number = 50
): () => void {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const teamsRef = collection(getFirebaseFirestore(), 'teams');
    const q = query(teamsRef, orderBy('label', 'asc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        callback(snapshot.docs.map(convertFirestoreDoc));
      },
      (error) => {
        if (isPermissionDenied(error)) {
          callback([]);
          return;
        }
        console.error('Error subscribing to teams:', error);
        callback([]);
      }
    );
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.error('Error setting up teams subscription:', error);
    }
    callback([]);
    return () => {};
  }
}
