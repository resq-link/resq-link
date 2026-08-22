import {
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import {
  resolveTeamById,
  resolveTeamByCode,
  buildAssignedTeamSnapshot,
  type AssignedTeamSnapshot,
} from './operationalTeams';

export interface CurrentTeamOnDutyState {
  teamId: string;
  teamName: string;
  teamCode: string;
  setAt?: Date | Timestamp | null;
  setBy?: string | null;
  setByName?: string | null;
}

const ensureAuthenticated = () => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('User must be authenticated');
  return user;
};

function toCurrentTeamState(data: DocumentData | undefined): CurrentTeamOnDutyState | null {
  const raw = data?.currentTeamOnDuty;
  if (!raw || typeof raw !== 'object') return null;
  const teamId = raw.teamId || raw.id;
  const teamName = raw.teamName || raw.label;
  const teamCode = raw.teamCode || raw.code;
  if (!teamId || !teamName || !teamCode) return null;
  return {
    teamId: String(teamId),
    teamName: String(teamName),
    teamCode: String(teamCode),
    setAt: raw.setAt?.toDate ? raw.setAt.toDate() : raw.setAt ?? null,
    setBy: raw.setBy ?? null,
    setByName: raw.setByName ?? null,
  };
}

export function subscribeToCommandCenterCurrentTeamOnDuty(
  commandCenterId: string,
  callback: (state: CurrentTeamOnDutyState | null) => void
): () => void {
  if (!commandCenterId) {
    callback(null);
    return () => {};
  }

  try {
    const ref = doc(getFirebaseFirestore(), 'commandCenters', commandCenterId);
    return onSnapshot(
      ref,
      (snapshot) => {
        callback(snapshot.exists() ? toCurrentTeamState(snapshot.data()) : null);
      },
      (error) => {
        console.error('Error subscribing to current team on duty:', error);
        callback(null);
      }
    );
  } catch (error) {
    console.error('Error setting up current team on duty subscription:', error);
    callback(null);
    return () => {};
  }
}

export async function setCommandCenterCurrentTeamOnDuty(
  teamId: string,
  options?: { setByName?: string | null }
): Promise<CurrentTeamOnDutyState> {
  const user = ensureAuthenticated();
  const trimmed = teamId.trim();
  const team =
    (await resolveTeamById(trimmed)) ||
    (await resolveTeamByCode(trimmed));
  if (!team?.id) {
    throw new Error('Operational team not found. Open Teams and ensure Whiskey/X-ray/Yankee/Zulu exist.');
  }

  const timestamp = Timestamp.now();
  const payload: CurrentTeamOnDutyState = {
    teamId: team.id,
    teamName: team.label,
    teamCode: team.code,
    setAt: timestamp,
    setBy: user.uid,
    setByName: options?.setByName ?? user.displayName ?? user.email ?? null,
  };

  await setDoc(
    doc(getFirebaseFirestore(), 'commandCenters', user.uid),
    {
      currentTeamOnDuty: payload,
      updatedAt: timestamp,
    },
    { merge: true }
  );

  return payload;
}

export function currentTeamToAssignmentSnapshot(
  current: CurrentTeamOnDutyState,
  assignedBy: string
): Pick<
  AssignedTeamSnapshot,
  'assignedTeamId' | 'assignedTeamName' | 'assignedTeamCode' | 'assignedTeamAt' | 'assignedTeamBy'
> {
  const teamRecord = {
    id: current.teamId,
    code: current.teamCode,
    label: current.teamName,
    isActive: true,
  };
  const snapshot = buildAssignedTeamSnapshot(teamRecord, assignedBy);
  return {
    assignedTeamId: snapshot.assignedTeamId,
    assignedTeamName: snapshot.assignedTeamName,
    assignedTeamCode: snapshot.assignedTeamCode,
    assignedTeamAt: snapshot.assignedTeamAt,
    assignedTeamBy: snapshot.assignedTeamBy,
  };
}
