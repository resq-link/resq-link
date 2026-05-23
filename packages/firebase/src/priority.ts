/**
 * Central incident prioritization (sound + visual coding) for RESQ-Link.
 */

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export const PRIORITY_LEVELS: IncidentPriority[] = ['critical', 'high', 'medium', 'low'];

/** Numeric rank for sorting (higher = more urgent). */
export const PRIORITY_RANK: Record<IncidentPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const ESCALATION_THRESHOLDS_MS = {
  intensify: 30_000,
  supervisor: 60_000,
  autoEscalate: 120_000,
} as const;

export const MAX_ESCALATION_LEVEL = 3;

/** Configurable default priority by civilian / coarse incident type. */
export const INCIDENT_TYPE_PRIORITY_MAP: Record<string, IncidentPriority> = {
  fire: 'critical',
  medical: 'high',
  flood_rescue: 'critical',
  vehicular_accident: 'high',
  police_emergency: 'high',
  electrical_powerline_hazard: 'high',
  other_emergency: 'medium',
};

const CRITICAL_DESCRIPTION_KEYWORDS = [
  'unconscious',
  'cardiac',
  'not breathing',
  'cpr',
  'severe',
  'life-threatening',
  'life threatening',
  'arrest',
];

const FLOOD_KEYWORDS = ['flood', 'flooding', 'evacuation', 'flash flood', 'water rescue'];

export type PriorityVisualTokens = {
  badgeEmoji: string;
  badgeLabel: string;
  colorHex: string;
  colorHexLight: string;
  tailwindText: string;
  tailwindBorder: string;
  tailwindBg: string;
  tailwindCard: string;
  tailwindPulse: string;
  tailwindBadge: string;
  mapMarkerColor: string;
  mapMarkerClass: string;
};

export const PRIORITY_VISUAL: Record<IncidentPriority, PriorityVisualTokens> = {
  critical: {
    badgeEmoji: '🔴',
    badgeLabel: 'CRITICAL',
    colorHex: '#dc2626',
    colorHexLight: '#fca5a5',
    tailwindText: 'text-red-300',
    tailwindBorder: 'border-red-500',
    tailwindBg: 'bg-red-500/15',
    tailwindCard: 'priority-card-critical',
    tailwindPulse: 'priority-pulse-critical',
    tailwindBadge: 'border-red-500/50 bg-red-500/20 text-red-200',
    mapMarkerColor: '#dc2626',
    mapMarkerClass: 'priority-marker-critical',
  },
  high: {
    badgeEmoji: '🟣',
    badgeLabel: 'HIGH',
    colorHex: '#7c3aed',
    colorHexLight: '#c4b5fd',
    tailwindText: 'text-violet-300',
    tailwindBorder: 'border-violet-500',
    tailwindBg: 'bg-violet-500/15',
    tailwindCard: 'priority-card-high',
    tailwindPulse: 'priority-pulse-high',
    tailwindBadge: 'border-violet-500/50 bg-violet-500/20 text-violet-200',
    mapMarkerColor: '#7c3aed',
    mapMarkerClass: 'priority-marker-high',
  },
  medium: {
    badgeEmoji: '🟡',
    badgeLabel: 'MEDIUM',
    colorHex: '#eab308',
    colorHexLight: '#fde047',
    tailwindText: 'text-yellow-300',
    tailwindBorder: 'border-yellow-500',
    tailwindBg: 'bg-yellow-500/15',
    tailwindCard: 'priority-card-medium',
    tailwindPulse: '',
    tailwindBadge: 'border-yellow-500/50 bg-yellow-500/20 text-yellow-200',
    mapMarkerColor: '#eab308',
    mapMarkerClass: 'priority-marker-medium',
  },
  low: {
    badgeEmoji: '🔵',
    badgeLabel: 'LOW',
    colorHex: '#10b981',
    colorHexLight: '#6ee7b7',
    tailwindText: 'text-emerald-300',
    tailwindBorder: 'border-emerald-500',
    tailwindBg: 'bg-emerald-500/10',
    tailwindCard: 'priority-card-low',
    tailwindPulse: '',
    tailwindBadge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    mapMarkerColor: '#10b981',
    mapMarkerClass: 'priority-marker-low',
  },
};

export type AlertAcknowledgmentFields = {
  priorityLevel?: IncidentPriority;
  priority?: IncidentPriority;
  alertAcknowledged?: boolean;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  acknowledgedByDispatcherId?: string | null;
  escalationLevel?: number;
  lastAlertAt?: Date | null;
  supervisorNotifiedAt?: Date | null;
  autoEscalatedAt?: Date | null;
};

export function normalizePriority(
  value: unknown,
  fallback: IncidentPriority = 'medium'
): IncidentPriority {
  const raw = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (raw === 'critical' || raw === 'high' || raw === 'medium' || raw === 'low') {
    return raw;
  }
  return fallback;
}

export function normalizePriorityFromRecord(
  data: Record<string, unknown>,
  incidentType?: string,
  description?: string | null
): IncidentPriority {
  const explicit =
    data.priority ??
    data.priorityLevel ??
    data.priority_level;
  if (explicit) {
    return normalizePriority(explicit);
  }
  if (incidentType) {
    return resolvePriorityForIncidentType(String(incidentType), {
      description: typeof description === 'string' ? description : null,
    });
  }
  return 'medium';
}

export function comparePriority(a: IncidentPriority, b: IncidentPriority): number {
  return PRIORITY_RANK[b] - PRIORITY_RANK[a];
}

export function sortByPriority<T extends { priority?: IncidentPriority | string }>(
  items: T[],
  options?: { thenByCreatedAtDesc?: (item: T) => number }
): T[] {
  return [...items].sort((left, right) => {
    const rankDiff =
      comparePriority(
        normalizePriority(left.priority),
        normalizePriority(right.priority)
      );
    if (rankDiff !== 0) return rankDiff;
    if (options?.thenByCreatedAtDesc) {
      return options.thenByCreatedAtDesc(right) - options.thenByCreatedAtDesc(left);
    }
    return 0;
  });
}

export function isHighPriority(priority: IncidentPriority): boolean {
  return priority === 'critical' || priority === 'high';
}

export function requiresForcedAlert(priority: IncidentPriority): boolean {
  return priority === 'critical';
}

/** Every priority level must surface acknowledgment UI in the command center. */
export function requiresAcknowledgmentUI(_priority: IncidentPriority): boolean {
  return true;
}

/** All unacknowledged incidents must use repeating/looping alert audio until acknowledged. */
export function requiresRepeatingAlert(_priority: IncidentPriority): boolean {
  return true;
}

export function resolvePriorityForIncidentType(
  incidentType: string,
  options?: { description?: string | null; override?: IncidentPriority | null }
): IncidentPriority {
  if (options?.override) {
    return normalizePriority(options.override);
  }

  const type = incidentType.toLowerCase().trim();
  const description = (options?.description || '').toLowerCase();

  if (type === 'medical' && CRITICAL_DESCRIPTION_KEYWORDS.some((k) => description.includes(k))) {
    return 'critical';
  }

  if (
    type === 'flood_rescue' ||
    (type === 'other_emergency' && FLOOD_KEYWORDS.some((k) => description.includes(k)))
  ) {
    return 'critical';
  }

  return INCIDENT_TYPE_PRIORITY_MAP[type] ?? 'medium';
}

/** @deprecated Use resolvePriorityForIncidentType */
export function getDefaultPriorityForIncidentType(incidentType: string): IncidentPriority {
  return resolvePriorityForIncidentType(incidentType);
}

export function getPriorityBadgeLabel(priority: IncidentPriority): string {
  const visual = PRIORITY_VISUAL[priority];
  return `${visual.badgeEmoji} ${visual.badgeLabel}`;
}

export function getIncidentPriorityTone(priority: IncidentPriority): string {
  return PRIORITY_VISUAL[priority].tailwindText;
}

export function getPriorityMapColor(priority: IncidentPriority): string {
  return PRIORITY_VISUAL[priority].mapMarkerColor;
}

export type EscalationPhase = 'none' | 'intensify' | 'supervisor' | 'auto_escalate';

export function getEscalationPhase(
  createdAtMs: number,
  acknowledged: boolean,
  escalationLevel: number = 0,
  nowMs: number = Date.now()
): EscalationPhase {
  if (acknowledged || escalationLevel >= MAX_ESCALATION_LEVEL) {
    return 'none';
  }
  const elapsed = nowMs - createdAtMs;
  if (elapsed >= ESCALATION_THRESHOLDS_MS.autoEscalate) return 'auto_escalate';
  if (elapsed >= ESCALATION_THRESHOLDS_MS.supervisor) return 'supervisor';
  if (elapsed >= ESCALATION_THRESHOLDS_MS.intensify) return 'intensify';
  return 'none';
}

export function getNextEscalationLevel(current: number, phase: EscalationPhase): number {
  if (phase === 'none') return current;
  const target =
    phase === 'intensify' ? 1 : phase === 'supervisor' ? 2 : phase === 'auto_escalate' ? 3 : current;
  return Math.min(MAX_ESCALATION_LEVEL, Math.max(current, target));
}
