import {
  subscribeToDispatcherAssignedEmergencies,
  acceptCase,
  type EmergencyReport,
} from "@packages/firebase";

export type AssignedEmergenciesOptions = {
  statusFilter?: "pending" | "active" | "resolved" | "all";
  limitCount?: number;
};

export function subscribeAssignedEmergencies(
  dispatcherId: string,
  onReports: (reports: EmergencyReport[]) => void,
  options?: AssignedEmergenciesOptions
) {
  return subscribeToDispatcherAssignedEmergencies(dispatcherId, onReports, options);
}

export async function acceptEmergencyCase(caseId: string) {
  return acceptCase(caseId);
}

export type { EmergencyReport };
