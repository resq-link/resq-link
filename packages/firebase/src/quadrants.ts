export const OPERATIONAL_QUADRANTS = [
  'CENTRO/POBLACION',
  'WESTERN',
  'EASTERN',
  'NORTHERN',
] as const;

export const MAP_QUADRANTS = [...OPERATIONAL_QUADRANTS, 'UNKNOWN'] as const;

export type OperationalQuadrant = (typeof OPERATIONAL_QUADRANTS)[number];
export type MapQuadrant = (typeof MAP_QUADRANTS)[number];

export const QUADRANT_LABELS: Record<OperationalQuadrant, string> = {
  'CENTRO/POBLACION': 'Centro/Poblacion',
  WESTERN: 'Western',
  EASTERN: 'Eastern',
  NORTHERN: 'Northern',
};

export const QUADRANT_COLORS: Record<MapQuadrant, { color: string; fill: string }> = {
  'CENTRO/POBLACION': { color: '#6366f1', fill: '#6366f1' },
  WESTERN: { color: '#14b8a6', fill: '#14b8a6' },
  EASTERN: { color: '#f59e0b', fill: '#f59e0b' },
  NORTHERN: { color: '#f43f5e', fill: '#f43f5e' },
  UNKNOWN: { color: '#94a3b8', fill: '#94a3b8' },
};

export const BARANGAY_QUADRANT_MAPPING: Record<string, OperationalQuadrant> = {
  'Centro 1 (Pob.)': 'CENTRO/POBLACION',
  'Centro 2 (Pob.)': 'CENTRO/POBLACION',
  'Centro 3 (Pob.)': 'CENTRO/POBLACION',
  'Centro 4 (Pob.)': 'CENTRO/POBLACION',
  'Centro 5 (Pob.)': 'CENTRO/POBLACION',
  'Centro 6 (Pob.)': 'CENTRO/POBLACION',
  'Centro 7 (Pob.)': 'CENTRO/POBLACION',
  'Centro 8 (Pob.)': 'CENTRO/POBLACION',
  'Centro 9 (Pob.)': 'CENTRO/POBLACION',
  'Centro 10 (Pob.)': 'CENTRO/POBLACION',
  'Centro 11 (Pob.)': 'CENTRO/POBLACION',
  'Centro 12 (Pob.)': 'CENTRO/POBLACION',
  Buntun: 'WESTERN',
  'Pallua Norte': 'WESTERN',
  'Pallua Sur': 'WESTERN',
  Bagay: 'WESTERN',
  'Cataggaman Nuevo': 'WESTERN',
  'Cataggaman Pardo': 'WESTERN',
  'Cataggaman Viejo': 'WESTERN',
  'San Gabriel': 'WESTERN',
  'Ugac Norte': 'WESTERN',
  'Ugac Sur': 'WESTERN',
  Tanza: 'EASTERN',
  Caggay: 'EASTERN',
  'Larion Alto': 'EASTERN',
  'Larion Bajo': 'EASTERN',
  Capatan: 'EASTERN',
  'Libag Norte': 'EASTERN',
  'Libag Sur': 'EASTERN',
  'Gosi Norte': 'EASTERN',
  'Gosi Sur': 'EASTERN',
  Tagga: 'EASTERN',
  Dadda: 'EASTERN',
  'Nambbalan Norte': 'EASTERN',
  'Nambbalan Sur': 'EASTERN',
  'Annafunan East': 'NORTHERN',
  'Annafunan West': 'NORTHERN',
  'Atulayan Norte': 'NORTHERN',
  'Atulayan Sur': 'NORTHERN',
  Carig: 'NORTHERN',
  'Caritan Centro': 'NORTHERN',
  'Caritan Norte': 'NORTHERN',
  'Caritan Sur': 'NORTHERN',
  Leonarda: 'NORTHERN',
  'Linao East': 'NORTHERN',
  'Linao West': 'NORTHERN',
  'Linao Norte': 'NORTHERN',
  'Pengue (Pengue-Ruyu)': 'NORTHERN',
};

const QUADRANT_ALIASES: Record<string, OperationalQuadrant> = {
  centro: 'CENTRO/POBLACION',
  poblacion: 'CENTRO/POBLACION',
  'centro/poblacion': 'CENTRO/POBLACION',
  western: 'WESTERN',
  west: 'WESTERN',
  eastern: 'EASTERN',
  east: 'EASTERN',
  northern: 'NORTHERN',
  north: 'NORTHERN',
};

export function normalizeQuadrant(value?: string | null): OperationalQuadrant | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const upper = normalized.toUpperCase() as OperationalQuadrant;
  if ((OPERATIONAL_QUADRANTS as readonly string[]).includes(upper)) {
    return upper;
  }

  return QUADRANT_ALIASES[normalized.toLowerCase()] || null;
}
