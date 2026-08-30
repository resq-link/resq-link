import {
  subscribeToResponderAssignedIncidents,
  acceptIncident,
  declineIncident,
  markIncidentTouchdown,
  submitPostIncidentReportForIncident,
  submitSceneReportForIncident,
  submitResponderSceneAssessmentForIncident,
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

/** Acknowledge priority alert and accept assignment (same backend path as accept). */
export async function acknowledgeIncidentCase(caseId: string) {
  return acceptIncident(caseId);
}

export async function declineIncidentCase(caseId: string, reason: string) {
  return declineIncident(caseId, reason);
}

export async function markIncidentCaseTouchdown(
  caseId: string,
  options: {
    source: 'gps' | 'manual';
    distanceMeters?: number | null;
    touchdownAt?: Date | string | number;
    onScenePhotoUrl?: string | null;
    onSceneLatitude?: number | null;
    onSceneLongitude?: number | null;
    onSceneGpsCapturedAt?: Date | string | number;
  }
) {
  return markIncidentTouchdown(caseId, options);
}

export async function submitIncidentSceneReport(caseId: string, sceneReport: any) {
  return submitSceneReportForIncident(caseId, sceneReport);
}

export async function submitIncidentPostReport(caseId: string, postReport: any) {
  return submitPostIncidentReportForIncident(caseId, postReport);
}

export async function submitIncidentSceneAssessment(
  caseId: string,
  fields: Record<string, string>,
  options?: { updatedByName?: string | null; actionPhotoUrl?: string | null },
) {
  return submitResponderSceneAssessmentForIncident(caseId, fields, options);
}

export type { IncidentRecord as EmergencyReport }; // Keep the export name the same for compatibility with other files if they import it from here
