  subscribeToResponderAssignedIncidents,
  acceptIncident,
  declineIncident,
  markIncidentTouchdown,
  submitPostIncidentReportForIncident,
  updateIncidentCaseStatus,
} from "@packages/firebase";
import type { IncidentRecord } from "@packages/firebase";

export type AssignedEmergenciesOptions = {
  statusFilter?: "pending" | "active" | "resolved" | "all";
  limitCount?: number;
};

export function subscribeAssignedIncidents(
  dispatcherId: string,
  onReports: (incidents: IncidentRecord[]) => void,
  options?: AssignedEmergenciesOptions
) {
  return subscribeToResponderAssignedIncidents(dispatcherId, onReports, options);
}

export async function acceptIncidentCase(caseId: string) {
  return acceptIncident(caseId);
}

export async function declineIncidentCase(caseId: string, reason: string) {
  return declineIncident(caseId, reason);
}

export async function markIncidentCaseTouchdown(caseId: string, options: { source: 'gps' | 'manual'; distanceMeters?: number | null; }) {
  return markIncidentTouchdown(caseId, options);
}

export async function submitIncidentPostReport(caseId: string, postReport: any) {
  return submitPostIncidentReportForIncident(caseId, postReport);
}

export async function updateIncidentStatus(caseId: string, newStatus: any) {
  return updateIncidentCaseStatus(caseId, newStatus);
}

export type { IncidentRecord as EmergencyReport }; // Keep the export name the same for compatibility with other files if they import it from here
