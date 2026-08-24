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
 * Fetch all agencies from Firestore 'agencies' collection with fallback to seed catalog only if empty.
 */
export async function getAllAgencies(options?: { activeOnly?: boolean }): Promise<AgencyRecord[]> {
  try {
    const db = getFirebaseFirestore();
    const agenciesCol = collection(db, 'agencies');
    const snap = await getDocs(agenciesCol);

    if (snap.empty) {
      return buildFallbackAgencies();
    }

    let items: AgencyRecord[] = snap.docs
      .filter((docSnap) => docSnap.data()?.deleted !== true)
      .map((docSnap) => mapAgencyDoc(docSnap.id, docSnap.data()));

    if (options?.activeOnly) {
      items = items.filter((item) => item.isActive);
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('[getAllAgencies] Failed to load agencies from Firestore, using seeds:', error);
    return buildFallbackAgencies();
  }
}

/**
 * Real-time subscription to the 'agencies' collection.
 * Strictly reflects documents created, edited, or deleted in Superadmin.
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
        let items: AgencyRecord[] = snap.docs
          .filter((docSnap) => docSnap.data()?.deleted !== true)
          .map((docSnap) => mapAgencyDoc(docSnap.id, docSnap.data()));

        // If collection is empty, use seeds
        if (items.length === 0 && snap.empty) {
          items = buildFallbackAgencies();
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
