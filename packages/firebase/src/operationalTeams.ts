import { Timestamp, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import type { IncidentRecord } from './incidents';
import type { TeamRecord } from './teams';

export const DEFAULT_OPERATIONAL_TEAMS: Array<{
  code: string;
  label: string;
  description: string;
  sortOrder: number;
}> = [
  { code: 'whiskey', label: 'Whiskey', description: 'Operational duty team Whiskey', sortOrder: 1 },
  { code: 'x-ray', label: 'X-ray', description: 'Operational duty team X-ray', sortOrder: 2 },
  { code: 'yankee', label: 'Yankee', description: 'Operational duty team Yankee', sortOrder: 3 },
  { code: 'zulu', label: 'Zulu', description: 'Operational duty team Zulu', sortOrder: 4 },
];

export interface AssignedTeamSnapshot {
  assignedTeamId: string;
  assignedTeamName: string;
  assignedTeamCode: string;
  assignedTeamAt: Timestamp;
  assignedTeamBy: string;
  teamId: string;
  teamName: string;
  teamOnDuty: string | null;
}

export interface TeamAssignmentHistoryEntry {
  id?: string;
  previousTeamId: string | null;
  previousTeamName: string | null;
  previousTeamCode: string | null;
  newTeamId: string;
  newTeamName: string;
  newTeamCode: string;
  reassignedBy: string;
  reassignedByName?: string | null;
  reassignedAt: Timestamp;
  reason?: string | null;
}

const normalizeCode = (value: string): string => value.trim().toLowerCase();

const normalizeLabel = (value: string): string => value.trim();

export function isKnownOperationalTeamLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeLabel(value).toLowerCase();
  return DEFAULT_OPERATIONAL_TEAMS.some(
    (team) => team.label.toLowerCase() === normalized || team.code === normalized
  );
}

export function getAssignedTeamId(incident: IncidentRecord): string | null {
  return incident.assignedTeamId ?? incident.teamId ?? null;
}

export function getAssignedTeamName(incident: IncidentRecord): string | null {
  return incident.assignedTeamName ?? incident.teamOnDuty ?? incident.teamName ?? null;
}

export function getAssignedTeamCode(incident: IncidentRecord): string | null {
  if (incident.assignedTeamCode) return incident.assignedTeamCode;
  const label = getAssignedTeamName(incident);
  if (!label) return null;
  const match = DEFAULT_OPERATIONAL_TEAMS.find(
    (team) => team.label.toLowerCase() === label.toLowerCase() || team.code === label.toLowerCase()
  );
  return match?.code ?? null;
}

export function incidentMatchesTeamFilter(
  incident: IncidentRecord,
  teamFilter: string | 'all'
): boolean {
  if (teamFilter === 'all') return true;
  const code = getAssignedTeamCode(incident);
  const name = getAssignedTeamName(incident);
  const filter = teamFilter.toLowerCase();
  return code === filter || name?.toLowerCase() === filter;
}

export function buildAssignedTeamSnapshot(
  team: TeamRecord,
  assignedBy: string,
  timestamp: Timestamp = Timestamp.now()
): AssignedTeamSnapshot {
  const teamId = team.id || '';
  const teamName = team.label;
  const teamCode = normalizeCode(team.code || team.label);

  return {
    assignedTeamId: teamId,
    assignedTeamName: teamName,
    assignedTeamCode: teamCode,
    assignedTeamAt: timestamp,
    assignedTeamBy: assignedBy,
    teamId,
    teamName,
    teamOnDuty: teamName,
  };
}

function toTeamRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TeamRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    code: String(data.code || snapshot.id),
    label: String(data.label || data.code || snapshot.id),
    description: (data.description as string | null) ?? null,
    isActive: data.isActive !== false,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    createdAt: data.createdAt as TeamRecord['createdAt'],
    updatedAt: data.updatedAt as TeamRecord['updatedAt'],
  };
}

export async function resolveTeamById(teamId: string): Promise<TeamRecord | null> {
  if (!teamId.trim()) return null;
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, 'teams', teamId.trim()));
  if (!snap.exists()) return null;
  return toTeamRecord(snap);
}

export async function resolveTeamByCode(code: string): Promise<TeamRecord | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const db = getFirebaseFirestore();
  const teamsRef = collection(db, 'teams');
  const byCode = query(teamsRef, where('code', '==', normalized));
  const codeSnap = await getDocs(byCode);
  if (!codeSnap.empty) {
    return toTeamRecord(codeSnap.docs[0]);
  }

  const allSnap = await getDocs(teamsRef);
  for (const teamDoc of allSnap.docs) {
    const team = toTeamRecord(teamDoc);
    if (normalizeCode(team.code) === normalized) return team;
    if (normalizeLabel(team.label).toLowerCase() === normalized) return team;
  }

  const defaultMatch = DEFAULT_OPERATIONAL_TEAMS.find((team) => team.code === normalized);
  if (defaultMatch) {
    return {
      id: '',
      code: defaultMatch.code,
      label: defaultMatch.label,
      description: defaultMatch.description,
      isActive: true,
      sortOrder: defaultMatch.sortOrder,
    };
  }

  return null;
}

export async function resolveTeamFromInput(input: {
  assignedTeamId?: string | null;
  teamOnDuty?: string | null;
  teamName?: string | null;
  assignedTeamCode?: string | null;
}): Promise<TeamRecord> {
  if (input.assignedTeamId?.trim()) {
    const byId = await resolveTeamById(input.assignedTeamId);
    if (byId) return byId;
  }

  const codeCandidate = input.assignedTeamCode || input.teamOnDuty || input.teamName;
  if (codeCandidate?.trim()) {
    const byCode = await resolveTeamByCode(codeCandidate);
    if (byCode) return byCode;
  }

  throw new Error('A valid assigned operational team is required.');
}

export function sortTeamsByOrder(teams: TeamRecord[]): TeamRecord[] {
  return [...teams]
    .filter((team) => team.isActive !== false)
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label);
    });
}
