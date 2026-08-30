import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import {
  DEFAULT_OPERATIONAL_TEAMS,
  deduplicateTeamsByCode,
} from './operationalTeams';

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

const normalizeTeamCode = (value: string): string => value.trim().toLowerCase();

const normalizeTeamLabel = (value: string): string => value.trim().toLowerCase();

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

function teamMatchesTemplate(
  team: TeamRecord,
  template: { code: string; label: string }
): boolean {
  const code = normalizeTeamCode(team.code || team.label);
  const label = normalizeTeamLabel(team.label || team.code);
  const templateCode = normalizeTeamCode(template.code);
  const templateLabel = normalizeTeamLabel(template.label);
  return code === templateCode || label === templateLabel || label === templateCode;
}

async function repointTeamReferences(
  fromTeamId: string,
  canonical: TeamRecord
): Promise<void> {
  if (!canonical.id || fromTeamId === canonical.id) return;

  const db = getFirebaseFirestore();
  let batch = writeBatch(db);
  let batchOps = 0;

  const commitIfNeeded = async (force = false) => {
    if (batchOps === 0) return;
    if (force || batchOps >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchOps = 0;
    }
  };

  const queueUpdate = async (ref: ReturnType<typeof doc>, data: Record<string, unknown>) => {
    batch.update(ref, data);
    batchOps += 1;
    await commitIfNeeded();
  };

  const incidentsRef = collection(db, 'incidents');
  const [assignedSnap, teamIdSnap] = await Promise.all([
    getDocs(query(incidentsRef, where('assignedTeamId', '==', fromTeamId), limit(500))),
    getDocs(query(incidentsRef, where('teamId', '==', fromTeamId), limit(500))),
  ]);

  const incidentDocIds = new Set<string>();
  assignedSnap.docs.forEach((snap) => incidentDocIds.add(snap.id));
  teamIdSnap.docs.forEach((snap) => incidentDocIds.add(snap.id));

  const incidentPatch = {
    assignedTeamId: canonical.id,
    assignedTeamName: canonical.label,
    assignedTeamCode: canonical.code,
    teamId: canonical.id,
    teamName: canonical.label,
    teamOnDuty: canonical.label,
    updatedAt: Timestamp.now(),
  };

  for (const incidentId of incidentDocIds) {
    await queueUpdate(doc(db, 'incidents', incidentId), incidentPatch);
  }

  const reportsRef = collection(db, 'emergency_reports');
  const reportSnap = await getDocs(
    query(reportsRef, where('assignedTeamId', '==', fromTeamId), limit(500))
  );
  for (const reportDoc of reportSnap.docs) {
    await queueUpdate(reportDoc.ref, {
      assignedTeamId: canonical.id,
      assignedTeamName: canonical.label,
      assignedTeamCode: canonical.code,
      updatedAt: Timestamp.now(),
    });
  }

  const dispatchersSnap = await getDocs(collection(db, 'dispatchers'));
  for (const dispatcherDoc of dispatchersSnap.docs) {
    const data = dispatcherDoc.data();
    if (data.teamId === fromTeamId) {
      await queueUpdate(dispatcherDoc.ref, {
        teamId: canonical.id,
        teamCode: canonical.code,
        teamLabel: canonical.label,
        updatedAt: Timestamp.now(),
      });
    }
  }

  const commandCentersSnap = await getDocs(collection(db, 'commandCenters'));
  for (const centerDoc of commandCentersSnap.docs) {
    const current = centerDoc.data().currentTeamOnDuty;
    if (current?.teamId === fromTeamId) {
      await queueUpdate(centerDoc.ref, {
        currentTeamOnDuty: {
          teamId: canonical.id,
          teamName: canonical.label,
          teamCode: canonical.code,
          setAt: current.setAt ?? Timestamp.now(),
          setBy: current.setBy ?? null,
          setByName: current.setByName ?? null,
        },
        updatedAt: Timestamp.now(),
      });
    }
  }

  await commitIfNeeded(true);
}

/**
 * Remove duplicate operational team docs and keep one canonical record per default code.
 */
async function cleanupDuplicateOperationalTeams(
  existingDocs: DocumentData[]
): Promise<void> {
  const db = getFirebaseFirestore();
  const teamsRef = collection(db, 'teams');
  const allTeams = existingDocs.map(convertFirestoreDoc);

  for (const template of DEFAULT_OPERATIONAL_TEAMS) {
    const canonicalRef = doc(teamsRef, template.code);
    const canonicalSnap = await getDoc(canonicalRef);
    const canonical: TeamRecord = canonicalSnap.exists()
      ? convertFirestoreDoc(canonicalSnap)
      : {
          id: template.code,
          code: template.code,
          label: template.label,
          description: template.description,
          isActive: true,
          sortOrder: template.sortOrder,
        };

    const duplicates = allTeams.filter(
      (team) => team.id && team.id !== template.code && teamMatchesTemplate(team, template)
    );

    for (const duplicate of duplicates) {
      if (!duplicate.id) continue;
      try {
        await repointTeamReferences(duplicate.id, canonical);
        await deleteDoc(doc(teamsRef, duplicate.id));
      } catch (error) {
        console.warn(`Could not remove duplicate team ${duplicate.id}:`, error);
      }
    }
  }
}

export async function createTeam(
  team: Omit<TeamRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TeamRecord> {
  ensureAuthenticated();
  const code = team.code.trim();
  const label = team.label.trim();
  if (!code) {
    throw new Error('Team code is required');
  }
  if (!label) {
    throw new Error('Team label is required');
  }

  const normalizedCode = normalizeTeamCode(code);
  const db = getFirebaseFirestore();
  const teamsRef = collection(db, 'teams');
  const existingSnap = await getDocs(teamsRef);

  const duplicate = existingSnap.docs
    .map(convertFirestoreDoc)
    .find((entry) => normalizeTeamCode(entry.code || entry.label) === normalizedCode);

  if (duplicate) {
    throw new Error(`Team code "${code}" already exists (${duplicate.label}).`);
  }

  const defaultTemplate = DEFAULT_OPERATIONAL_TEAMS.find(
    (entry) => normalizeTeamCode(entry.code) === normalizedCode
  );

  const payload = {
    code,
    label,
    description: normalizeNullableString(team.description),
    isActive: team.isActive !== false,
    sortOrder: team.sortOrder ?? defaultTemplate?.sortOrder,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (defaultTemplate) {
    const docRef = doc(teamsRef, defaultTemplate.code);
    await setDoc(docRef, payload, { merge: true });
    return {
      ...payload,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

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
  return deduplicateTeamsByCode(
    snapshot.docs.map(convertFirestoreDoc).filter((team) => team.isActive !== false)
  ).sort((left, right) => left.label.localeCompare(right.label));
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
    const q = query(teamsRef, limit(limitCount));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const teams = deduplicateTeamsByCode(snapshot.docs.map(convertFirestoreDoc)).sort((left, right) =>
          left.label.localeCompare(right.label)
        );
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
 * Uses stable document IDs (= code). Removes legacy duplicate team documents.
 */
export async function ensureDefaultOperationalTeams(): Promise<TeamRecord[]> {
  ensureAuthenticated();
  const db = getFirebaseFirestore();
  const teamsRef = collection(db, 'teams');
  const existingSnap = await getDocs(teamsRef);

  await cleanupDuplicateOperationalTeams(existingSnap.docs);

  const refreshedSnap = await getDocs(teamsRef);
  const ensured: TeamRecord[] = [];

  for (const template of DEFAULT_OPERATIONAL_TEAMS) {
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
