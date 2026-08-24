import {
  collection,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

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
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string | null;
}

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
    name: 'MDRRMO / Rescue 1111',
    type: 'disaster_response',
    description: 'Municipal disaster risk reduction and management.',
  },
  {
    code: 'AMBULANCE',
    name: 'Ambulance Service / TCPGH / CHO',
    type: 'medical_response',
    description: 'Emergency medical transport and hospital response.',
  },
  {
    code: 'PCG',
    name: 'Philippine Coast Guard',
    type: 'maritime_response',
    description: 'Maritime safety and coastal response.',
  },
  {
    code: 'TFLC',
    name: 'Task Force Lingkod Cagayan',
    type: 'disaster_response',
    description: 'Provincial and municipal emergency task force.',
  },
  {
    code: 'PSSO_TCTMG',
    name: 'PSSO / TCTMG (Traffic Management)',
    type: 'law_enforcement',
    description: 'Public safety and traffic management group.',
  },
  {
    code: 'BARANGAY_OFFICIALS',
    name: 'Barangay Officials & Tanods',
    type: 'other',
    description: 'Local barangay emergency personnel.',
  },
  {
    code: 'WATER_DISTRICT',
    name: 'Tuguegarao Water District',
    type: 'other',
    description: 'Municipal water utility and hydrant support.',
  },
  {
    code: 'CAGELCO_1',
    name: 'CAGELCO 1 (Electric Cooperative)',
    type: 'other',
    description: 'Power and electric utility safety response.',
  },
  {
    code: 'COMMAND_CENTER',
    name: 'Command Center Dispatch',
    type: 'other',
    description: 'Integrated emergency operations center.',
  },
];

export function mapAgencyDoc(id: string, data: Record<string, any>): AgencyRecord {
  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : id,
    code: typeof data.code === 'string' && data.code.trim() ? data.code.trim().toUpperCase() : id.toUpperCase(),
    type: (data.type as AgencyType) || 'other',
    description: typeof data.description === 'string' ? data.description : '',
    contactEmail: typeof data.contactEmail === 'string' ? data.contactEmail : undefined,
    contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    isActive: data.isActive !== false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : null,
  };
}

export function buildFallbackAgencies(): AgencyRecord[] {
  return SEED_AGENCIES.map((seed) => ({
    id: seed.code,
    name: seed.name,
    code: seed.code,
    type: seed.type,
    description: seed.description,
    isActive: true,
  }));
}

/**
 * Fetch all active agencies from Firestore 'agencies' collection with fallback to seed catalog.
 */
export async function getAllAgencies(options?: { activeOnly?: boolean }): Promise<AgencyRecord[]> {
  try {
    const db = getFirebaseFirestore();
    const agenciesCol = collection(db, 'agencies');
    const snap = await getDocs(agenciesCol);

    if (snap.empty) {
      return buildFallbackAgencies();
    }

    let items: AgencyRecord[] = snap.docs.map((docSnap) =>
      mapAgencyDoc(docSnap.id, docSnap.data())
    );

    if (options?.activeOnly) {
      items = items.filter((item) => item.isActive);
    }

    // Merge in any core seed agencies that might not yet be in the database
    const existingCodes = new Set(items.map((i) => i.code.toUpperCase()));
    for (const seed of SEED_AGENCIES) {
      if (!existingCodes.has(seed.code.toUpperCase())) {
        items.push({
          id: seed.code,
          name: seed.name,
          code: seed.code,
          type: seed.type,
          description: seed.description,
          isActive: true,
        });
      }
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('[getAllAgencies] Failed to load agencies from Firestore, using seeds:', error);
    return buildFallbackAgencies();
  }
}

/**
 * Real-time subscription to the 'agencies' collection.
 */
export function subscribeToAgencies(
  callback: (agencies: AgencyRecord[]) => void,
  options?: { activeOnly?: boolean }
): Unsubscribe {
  try {
    const db = getFirebaseFirestore();
    const agenciesCol = collection(db, 'agencies');

    return onSnapshot(
      agenciesCol,
      (snap) => {
        let items: AgencyRecord[] = snap.docs.map((docSnap) =>
          mapAgencyDoc(docSnap.id, docSnap.data())
        );

        // If collection is empty, use seeds
        if (items.length === 0) {
          items = buildFallbackAgencies();
        } else {
          // Merge seeds that are missing
          const existingCodes = new Set(items.map((i) => i.code.toUpperCase()));
          for (const seed of SEED_AGENCIES) {
            if (!existingCodes.has(seed.code.toUpperCase())) {
              items.push({
                id: seed.code,
                name: seed.name,
                code: seed.code,
                type: seed.type,
                description: seed.description,
                isActive: true,
              });
            }
          }
        }

        if (options?.activeOnly) {
          items = items.filter((item) => item.isActive);
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        callback(items);
      },
      (error) => {
        console.warn('[subscribeToAgencies] Subscription error, falling back to seed list:', error);
        callback(buildFallbackAgencies());
      }
    );
  } catch (error) {
    console.warn('[subscribeToAgencies] Initialization error:', error);
    callback(buildFallbackAgencies());
    return () => {};
  }
}
