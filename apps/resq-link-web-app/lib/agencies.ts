import type { AgencyOption } from './agencyTypes';
import { SEED_AGENCIES } from './agencyTypes';

/** @deprecated Prefer live agency directory via useAgencies / /api/agencies. Kept as offline fallback. */
export const AGENCIES: AgencyOption[] = SEED_AGENCIES.map((agency) => ({
  value: agency.code,
  code: agency.code,
  label: agency.name,
  isActive: true,
}));

export const AGENCY_VALUES = AGENCIES.map((agency) => agency.value);

export function isDispatcherAgency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,31}$/.test(value.trim().toUpperCase());
}

export function agencyLabel(value: string | null | undefined, directory?: AgencyOption[]): string {
  if (!value) return '—';
  const code = value.trim().toUpperCase();
  const fromDirectory = directory?.find((agency) => agency.code === code || agency.value === code);
  if (fromDirectory) return fromDirectory.label;
  return AGENCIES.find((agency) => agency.value === code)?.label || code;
}

export function agencyDisplay(value: string | null | undefined, directory?: AgencyOption[]): string {
  if (!value) return '—';
  const code = value.trim().toUpperCase();
  const label = agencyLabel(code, directory);
  return label === code ? code : `${label} (${code})`;
}
