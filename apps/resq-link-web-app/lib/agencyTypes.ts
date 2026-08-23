export type AgencyType =
  | 'fire_rescue'
  | 'law_enforcement'
  | 'disaster_response'
  | 'medical_response'
  | 'maritime_response'
  | 'other';

export interface AgencyRecord {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface AgencyOption {
  value: string;
  label: string;
  code: string;
  isActive: boolean;
}

export const AGENCY_TYPE_OPTIONS: { value: AgencyType; label: string }[] = [
  { value: 'fire_rescue', label: 'Fire & Rescue' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'disaster_response', label: 'Disaster Response' },
  { value: 'medical_response', label: 'Medical Response' },
  { value: 'maritime_response', label: 'Maritime Response' },
  { value: 'other', label: 'Other' },
];

export function agencyTypeLabel(type: string | null | undefined): string {
  return AGENCY_TYPE_OPTIONS.find((item) => item.value === type)?.label || type || '—';
}

/** Seed catalog used for idempotent bootstrap + legacy fallbacks. */
export const SEED_AGENCIES: Array<{
  code: string;
  name: string;
  type: AgencyType;
  description: string;
}> = [
  {
    code: 'BFP',
    name: 'Bureau of Fire Protection',
    type: 'fire_rescue',
    description: 'Fire suppression and rescue services.',
  },
  {
    code: 'PNP',
    name: 'Philippine National Police',
    type: 'law_enforcement',
    description: 'Law enforcement and public safety.',
  },
  {
    code: 'MDRRMO',
    name: 'MDRRMO',
    type: 'disaster_response',
    description: 'Municipal disaster risk reduction and management.',
  },
  {
    code: 'AMBULANCE',
    name: 'Ambulance Service',
    type: 'medical_response',
    description: 'Emergency medical transport and response.',
  },
  {
    code: 'PCG',
    name: 'Philippine Coast Guard',
    type: 'maritime_response',
    description: 'Maritime safety and coastal response.',
  },
];

export function normalizeAgencyCode(value: string): string {
  // Avoid trim-while-typing (caret jumps). Callers should trim on submit if needed.
  return value.toUpperCase().replace(/\s+/g, '_');
}

export function finalizeAgencyCode(value: string): string {
  return normalizeAgencyCode(value).replace(/^_+|_+$/g, '');
}

export function isValidAgencyCodeFormat(value: string): boolean {
  return /^[A-Z][A-Z0-9_]{1,31}$/.test(value);
}
