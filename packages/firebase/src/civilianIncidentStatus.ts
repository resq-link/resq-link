import type { EmergencyReport } from './emergencies';
import { normalizeOperationalStatus } from './incidentStatusVisual';

export type CivilianStatusKey =
  | 'loading'
  | 'cancelled'
  | 'resolved'
  | 'on_scene'
  | 'en_route'
  | 'assigned'
  | 'elevated'
  | 'reviewing'
  | 'waiting'
  | 'received';

export type CivilianStatusPresentation = {
  title: string;
  description: string;
  showPulse: boolean;
  key: CivilianStatusKey;
};

export type LinkedIncidentStatusSnapshot = {
  status?: string | null;
  resolutionStatus?: string | null;
  resolvedAt?: Date | null;
};

export type CivilianReportStatusInput = EmergencyReport & {
  linkedIncidentStatus?: string | null;
  linkedIncidentResolutionStatus?: string | null;
  linkedIncidentResolvedAt?: Date | null;
};

function isResolvedLikeStatus(status: string | null | undefined): boolean {
  const raw = String(status || '').toLowerCase().trim();
  if (!raw) return false;
  return raw === 'resolved' || raw === 'done' || raw === 'completed';
}

/** Whether the civilian report or linked incident is in a terminal resolved state. */
export function isCivilianIncidentResolved(
  report: CivilianReportStatusInput | null | undefined,
  linkedIncident?: LinkedIncidentStatusSnapshot | null,
): boolean {
  if (!report) return false;

  const linked = linkedIncident ?? {
    status: report.linkedIncidentStatus,
    resolutionStatus: report.linkedIncidentResolutionStatus,
    resolvedAt: report.linkedIncidentResolvedAt ?? null,
  };

  if (isResolvedLikeStatus(report.status)) return true;
  if (normalizeOperationalStatus(report.status) === 'resolved') return true;
  if (report.movedToHistoryAt) return true;
  if (report.postIncidentReport?.submittedAt) return true;
  if (report.resolvedAt) return true;

  if (isResolvedLikeStatus(linked.status)) return true;
  if (String(linked.resolutionStatus || '').toLowerCase() === 'resolved') return true;
  if (linked.resolvedAt) return true;

  return false;
}

/**
 * Civilian-facing incident status — linked operational incident is authoritative after elevation.
 * Terminal states (resolved) always win over stale fields such as `acceptedAt`.
 */
export function getCivilianIncidentStatusPresentation(
  report: CivilianReportStatusInput | null | undefined,
  linkedIncident?: LinkedIncidentStatusSnapshot | null,
): CivilianStatusPresentation {
  if (!report) {
    return {
      title: 'Report Received',
      description: 'Your emergency report is being loaded…',
      showPulse: true,
      key: 'loading',
    };
  }

  const linked = linkedIncident ?? {
    status: report.linkedIncidentStatus,
    resolutionStatus: report.linkedIncidentResolutionStatus,
    resolvedAt: report.linkedIncidentResolvedAt ?? null,
  };

  const rawStatus = (report.status || '').toLowerCase().trim();
  const normalized = normalizeOperationalStatus(report.status);
  const linkedStatus = String(linked.status || '').toLowerCase().trim();

  if (normalized === 'cancelled' || rawStatus === 'rejected' || rawStatus === 'declined') {
    return {
      title: 'Incident Cancelled',
      description: 'This emergency report was cancelled.',
      showPulse: false,
      key: 'cancelled',
    };
  }

  if (isCivilianIncidentResolved(report, linked)) {
    return {
      title: 'Incident Resolved',
      description: 'This emergency has been marked as resolved.',
      showPulse: false,
      key: 'resolved',
    };
  }

  const onScene =
    linkedStatus === 'on_scene' ||
    normalized === 'on_scene' ||
    report.touchdownAt ||
    rawStatus === 'on_scene';

  if (onScene) {
    return {
      title: 'Responders On Scene',
      description: 'Emergency responders have arrived and are handling the incident.',
      showPulse: false,
      key: 'on_scene',
    };
  }

  const explicitEnRouteStatuses = new Set(['enroute', 'en_route', 'responding']);
  const enRoute =
    explicitEnRouteStatuses.has(rawStatus) ||
    explicitEnRouteStatuses.has(linkedStatus) ||
    Boolean(report.acceptedAt);

  if (enRoute) {
    return {
      title: 'Responders En Route',
      description: 'Responders are currently traveling to your location.',
      showPulse: true,
      key: 'en_route',
    };
  }

  const hasAssignedResponder =
    report.assignedResponderId ||
    report.responder ||
    (Array.isArray((report as { assignedResponderIds?: string[] }).assignedResponderIds) &&
      (report as { assignedResponderIds?: string[] }).assignedResponderIds!.length > 0) ||
    report.assignedTeamName;

  if (hasAssignedResponder) {
    return {
      title: 'Responders Assigned',
      description: 'Emergency responders have been assigned to your incident.',
      showPulse: true,
      key: 'assigned',
    };
  }

  if (report.incidentId || linkedStatus === 'dispatched' || linkedStatus === 'awaiting_resources') {
    return {
      title: 'Elevated for Dispatch',
      description:
        'Your report has been elevated. Responders are being dispatched to your incident.',
      showPulse: true,
      key: 'elevated',
    };
  }

  if (report.viewedAt || report.viewedByName || report.acknowledgedAt) {
    return {
      title: 'Dispatcher Reviewing',
      description: 'The dispatcher is currently verifying your emergency report.',
      showPulse: true,
      key: 'reviewing',
    };
  }

  if (normalized === 'pending' || rawStatus === 'linked') {
    return {
      title: 'Waiting for Dispatcher',
      description:
        'Your emergency report has been received and is waiting to be reviewed.',
      showPulse: true,
      key: 'waiting',
    };
  }

  return {
    title: 'Report Received',
    description: 'Your emergency report has been submitted successfully.',
    showPulse: true,
    key: 'received',
  };
}

export function getCivilianStatusShortLabel(
  report: CivilianReportStatusInput | null | undefined,
  linkedIncident?: LinkedIncidentStatusSnapshot | null,
): string {
  const presentation = getCivilianIncidentStatusPresentation(report, linkedIncident);
  switch (presentation.key) {
    case 'en_route':
      return 'Responder En Route';
    case 'on_scene':
      return 'Responders On Scene';
    case 'assigned':
      return 'Responder Assigned';
    case 'elevated':
      return 'Elevated for Dispatch';
    case 'reviewing':
      return 'Dispatcher Reviewing';
    case 'waiting':
      return 'Awaiting Dispatch';
    case 'resolved':
      return 'Resolved';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Report Received';
  }
}
