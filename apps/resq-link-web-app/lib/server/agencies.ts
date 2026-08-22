import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { isResponderDesignation } from '@/lib/server/accounts';
import { toIso } from '@/lib/server/timestamps';
import {
  SEED_AGENCIES,
  isValidAgencyCodeFormat,
  normalizeAgencyCode,
  type AgencyRecord,
  type AgencyType,
} from '@/lib/agencyTypes';

const COLLECTION = 'agencies';

export async function ensureSeedAgencies(): Promise<void> {
  const db = getAdminFirestore();
  const batch = db.batch();
  let writes = 0;

  for (const seed of SEED_AGENCIES) {
    const ref = db.doc(`${COLLECTION}/${seed.code}`);
    const snap = await ref.get();
    if (snap.exists) continue;
    batch.set(ref, {
      name: seed.name,
      code: seed.code,
      type: seed.type,
      description: seed.description,
      contactEmail: '',
      contactPhone: '',
      address: '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: null,
      seeded: true,
    });
    writes += 1;
  }

  if (writes > 0) {
    await batch.commit();
  }
}

export function mapAgencyDoc(id: string, data: Record<string, unknown>): AgencyRecord {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : id,
    code: typeof data.code === 'string' ? data.code : id,
    type: (typeof data.type === 'string' ? data.type : 'other') as AgencyType,
    description: typeof data.description === 'string' ? data.description : '',
    contactEmail: typeof data.contactEmail === 'string' ? data.contactEmail : '',
    contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : '',
    address: typeof data.address === 'string' ? data.address : '',
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : null,
  };
}

export async function listAgenciesFromDb(): Promise<AgencyRecord[]> {
  await ensureSeedAgencies();
  const snap = await getAdminFirestore().collection(COLLECTION).get();
  return snap.docs
    .map((doc) => mapAgencyDoc(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function getAgencyByCode(code: string): Promise<AgencyRecord | null> {
  const normalized = normalizeAgencyCode(code);
  if (!normalized) return null;
  await ensureSeedAgencies();
  const snap = await getAdminFirestore().doc(`${COLLECTION}/${normalized}`).get();
  if (!snap.exists) return null;
  return mapAgencyDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function assertAssignableAgencyCode(
  code: unknown,
  options?: { allowInactive?: boolean }
): Promise<string> {
  if (typeof code !== 'string') {
    throw Object.assign(new Error('Agency is required'), { status: 400 });
  }
  const normalized = normalizeAgencyCode(code);
  if (!isValidAgencyCodeFormat(normalized)) {
    throw Object.assign(new Error('Invalid agency code format'), { status: 400 });
  }
  const agency = await getAgencyByCode(normalized);
  if (!agency) {
    throw Object.assign(new Error('Unknown agency. Add it in Agency Management first.'), { status: 400 });
  }
  if (!options?.allowInactive && !agency.isActive) {
    throw Object.assign(new Error('This agency is disabled and cannot be assigned to new accounts.'), {
      status: 400,
    });
  }
  return agency.code;
}

export async function countPersonnelByAgencyCode(): Promise<
  Record<string, { dispatchers: number; responders: number; total: number }>
> {
  const snap = await getAdminFirestore().collection('dispatchers').get();
  const counts: Record<string, { dispatchers: number; responders: number; total: number }> = {};

  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const code = normalizeAgencyCode(String(data.role || ''));
    if (!code) return;
    if (!counts[code]) counts[code] = { dispatchers: 0, responders: 0, total: 0 };
    if (isResponderDesignation(data.designation)) counts[code].responders += 1;
    else counts[code].dispatchers += 1;
    counts[code].total += 1;
  });

  return counts;
}

export async function attachPersonnelCounts(agencies: AgencyRecord[]): Promise<AgencyRecord[]> {
  const counts = await countPersonnelByAgencyCode();
  return agencies.map((agency) => ({
    ...agency,
    personnel: counts[agency.code] || { dispatchers: 0, responders: 0, total: 0 },
  }));
}
