/**
 * Central operational incident status presentation (label, dot/text colors, pulse on dot only).
 */

export type OperationalIncidentStatus =
  | 'pending'
  | 'active'
  | 'on_scene'
  | 'resolved'
  | 'cancelled';

export type ThemeMode = 'light' | 'dark';

export type StatusColorSet = {
  /** Dot fill color */
  dot: string;
  /** Status label text color */
  text: string;
};

export type IncidentStatusVisualToken = {
  label: string;
  pulse: boolean;
  light: StatusColorSet;
  dark: StatusColorSet;
  /** Tailwind text color (dispatcher web) */
  tailwindText: string;
  /** Tailwind dot background (dispatcher web) */
  tailwindDot: string;
};

export const INCIDENT_STATUS_VISUAL: Record<
  OperationalIncidentStatus,
  IncidentStatusVisualToken
> = {
  pending: {
    label: 'Pending',
    pulse: true,
    light: { dot: '#EA580C', text: '#C2410C' },
    dark: { dot: '#FB923C', text: '#FDBA74' },
    tailwindText: 'text-orange-400',
    tailwindDot: 'bg-orange-400',
  },
  active: {
    label: 'Active',
    pulse: true,
    light: { dot: '#DC2626', text: '#B91C1C' },
    dark: { dot: '#F87171', text: '#FCA5A5' },
    tailwindText: 'text-red-400',
    tailwindDot: 'bg-red-400',
  },
  on_scene: {
    label: 'On Scene',
    pulse: false,
    light: { dot: '#2563EB', text: '#1D4ED8' },
    dark: { dot: '#60A5FA', text: '#93C5FD' },
    tailwindText: 'text-blue-400',
    tailwindDot: 'bg-blue-400',
  },
  resolved: {
    label: 'Resolved',
    pulse: false,
    light: { dot: '#16A34A', text: '#15803D' },
    dark: { dot: '#4ADE80', text: '#86EFAC' },
    tailwindText: 'text-green-400',
    tailwindDot: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    pulse: false,
    light: { dot: '#9CA3AF', text: '#4B5563' },
    dark: { dot: '#94A3B8', text: '#CBD5E1' },
    tailwindText: 'text-slate-400',
    tailwindDot: 'bg-slate-400',
  },
};

const STATUS_ALIASES: Record<string, OperationalIncidentStatus> = {
  pending: 'pending',
  new: 'pending',
  linked: 'pending',
  awaiting_resources: 'pending',
  liaison_pending: 'pending',
  unresolved: 'pending',
  active: 'active',
  enroute: 'active',
  responding: 'active',
  dispatched: 'active',
  on_scene: 'on_scene',
  resolved: 'resolved',
  done: 'resolved',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

/** Dot-only pulse animation tuning (shared web + mobile). */
export const INCIDENT_STATUS_DOT_PULSE = {
  scaleFrom: 1,
  scaleTo: 1.4,
  opacityFrom: 1,
  opacityTo: 0.4,
  durationMs: 1000,
} as const;

export function normalizeOperationalStatus(
  raw: string | null | undefined,
): OperationalIncidentStatus {
  const key = (raw ?? '').toLowerCase().trim();
  return STATUS_ALIASES[key] ?? 'pending';
}

export function getIncidentStatusVisual(
  status: string | OperationalIncidentStatus | null | undefined,
): IncidentStatusVisualToken {
  if (
    status &&
    Object.prototype.hasOwnProperty.call(INCIDENT_STATUS_VISUAL, status)
  ) {
    return INCIDENT_STATUS_VISUAL[status as OperationalIncidentStatus];
  }
  return INCIDENT_STATUS_VISUAL[normalizeOperationalStatus(status)];
}

export function getIncidentStatusLabel(
  status: string | null | undefined,
): string {
  return getIncidentStatusVisual(status).label.toUpperCase();
}

export function getIncidentStatusColors(
  status: string | null | undefined,
  mode: ThemeMode = 'dark',
): StatusColorSet {
  const visual = getIncidentStatusVisual(status);
  return mode === 'light' ? visual.light : visual.dark;
}

export function shouldPulseIncidentStatus(
  status: string | null | undefined,
): boolean {
  return getIncidentStatusVisual(status).pulse;
}

export function getIncidentStatusTailwindTextClass(
  status: string | null | undefined,
): string {
  return getIncidentStatusVisual(status).tailwindText;
}

export function getIncidentStatusTailwindDotClass(
  status: string | null | undefined,
): string {
  return getIncidentStatusVisual(status).tailwindDot;
}
