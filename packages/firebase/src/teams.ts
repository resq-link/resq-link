import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { DEFAULT_OPERATIONAL_TEAMS } from './operationalTeams';

export interface TeamRecord {
  id?: string;
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number;
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
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
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
  const q = query(teamsRef, limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(convertFirestoreDoc)
    .filter((team) => team.isActive !== false)
    .sort((left, right) => left.label.localeCompare(right.label));
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
    const teamsRef = collection(getFirebaseFirestore(), 'teams');
    // Avoid orderBy('label') so docs missing `label` still appear; sort client-side.
    const q = query(teamsRef, limit(limitCount));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const teams = snapshot.docs
          .map(convertFirestoreDoc)
          .sort((left, right) => left.label.localeCompare(right.label));
        callback(teams);
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

/**
 * Idempotently ensure the four default operational teams exist in Firestore.
 * Prefer stable document IDs (= code) so resolveTeamById(code) also works.
 */
export async function ensureDefaultOperationalTeams(): Promise<TeamRecord[]> {
  ensureAuthenticated();
  const db = getFirebaseFirestore();
  const teamsRef = collection(db, 'teams');
  const existingSnap = await getDocs(teamsRef);
  const existingByCode = new Map<string, TeamRecord>();

  existingSnap.docs.forEach((teamDoc) => {
    const team = convertFirestoreDoc(teamDoc);
    existingByCode.set(team.code.toLowerCase(), team);
  });

  const ensured: TeamRecord[] = [];

  for (const template of DEFAULT_OPERATIONAL_TEAMS) {
    const existing = existingByCode.get(template.code.toLowerCase());
    if (existing?.id) {
      ensured.push(existing);
      continue;
    }

    const payload = {
      code: template.code,
      label: template.label,
      description: template.description,
      isActive: true,
      sortOrder: template.sortOrder,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = doc(teamsRef, template.code);
    await setDoc(docRef, payload, { merge: true });
    ensured.push({
      ...payload,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return ensured.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
}
