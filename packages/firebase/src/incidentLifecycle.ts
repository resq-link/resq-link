import type { EmergencyReport } from './emergencies';
import type { IncidentRecord } from './incidents';

/** Terminal incident statuses (includes legacy `done`). */
export function isResolvedIncidentStatus(
  status: IncidentRecord['status'] | string | undefined | null
): boolean {
  return status === 'resolved' || status === 'done';
}

export function isResolvedResolutionStatus(
  resolutionStatus: IncidentRecord['resolutionStatus'] | string | undefined | null
): boolean {
  return resolutionStatus === 'resolved';
}

/**
 * Live operational queue — shown in Intake and Active Incidents.
 * Excludes records marked resolved on either status or resolutionStatus.
 */
export function isLiveIncident(
  incident: Pick<IncidentRecord, 'status' | 'resolutionStatus'>
): boolean {
  if (isResolvedIncidentStatus(incident.status)) return false;
  if (isResolvedResolutionStatus(incident.resolutionStatus)) return false;
  return true;
}

/** Resolved / completed — Reports, Export Center, and History archive. */
export function isResolvedIncidentRecord(
  incident: Pick<IncidentRecord, 'status' | 'resolutionStatus'>
): boolean {
  return (
    isResolvedIncidentStatus(incident.status) ||
    isResolvedResolutionStatus(incident.resolutionStatus)
  );
}

/** App emergency still in live dispatcher queues. */
export function isLiveEmergencyReport(
  report: Pick<EmergencyReport, 'status'>
): boolean {
  const status = report.status;
  return status !== 'done' && status !== 'resolved';
}

/** App emergency completed — eligible for reporting when converted. */
export function isResolvedEmergencyReport(
  report: Pick<EmergencyReport, 'status'>
): boolean {
  return report.status === 'done' || report.status === 'resolved';
}

/**
 * Completed records only for analytics and export.
 * Cancelled cases are excluded.
 */
export function isReportEligibleIncident(
  incident: Pick<IncidentRecord, 'status' | 'resolutionStatus'>
): boolean {
  const status = incident.status as string;
  if (status === 'cancelled') return false;
  return isResolvedIncidentRecord(incident);
}
