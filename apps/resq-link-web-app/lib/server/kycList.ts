import type { Query } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';
import { asString } from '@/lib/server/accounts';
import { mapRoleAlias } from '@/lib/server/accountClassification';
import { toIso } from '@/lib/server/timestamps';
import type { KycListItem } from '@/lib/accountTypes';

const KYC_SELECT = [
  'name',
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'govIdType',
  'status',
  'deleted',
  'role',
  'kycRejectionReason',
  'kycSubmittedAt',
  'kycReviewedAt',
  'kycReviewedBy',
  'govIdFrontUrl',
] as const;

const KYC_ELIGIBILITY_SELECT = ['status', 'govIdType', 'deleted', 'role'] as const;
const MAX_KYC_SCAN = 500;

export type KycTab = 'pending' | 'approved' | 'rejected';

export interface KycListParams {
  tab?: KycTab;
  search?: string;
  page?: number;
  pageSize?: number;
  includeMedia?: boolean;
}

/** Active civilian KYC records shown in Super Admin review (excludes deleted/archived profiles). */
export function isActiveKycCivilian(data: Record<string, unknown>): boolean {
  if (data.deleted === true) return false;
  return mapRoleAlias(data.role) === 'civilian';
}

/** Maps an active civilian profile to a KYC review bucket, if any. */
export function resolveKycBucket(data: Record<string, unknown>): KycTab | null {
  if (!isActiveKycCivilian(data)) return null;

  const status = asString(data.status);
  if (status === 'pending_kyc_review') return 'pending';
  if (status === 'rejected') return 'rejected';
  if (status === 'active' && Boolean(asString(data.govIdType))) return 'approved';
  return null;
}

function mapKycItem(id: string, data: Record<string, unknown>, includeMedia: boolean): KycListItem {
  return {
    id,
    name:
      asString(data.name) ||
      `${asString(data.firstName)} ${asString(data.lastName)}`.trim() ||
      '—',
    email: asString(data.email),
    phone: asString(data.phone),
    address: asString(data.address),
    govIdType: asString(data.govIdType),
    govIdFrontUrl: includeMedia ? asString(data.govIdFrontUrl) : '',
    status: asString(data.status),
    kycRejectionReason: asString(data.kycRejectionReason) || null,
    kycSubmittedAt: toIso(data.kycSubmittedAt),
    kycReviewedAt: toIso(data.kycReviewedAt),
    kycReviewedBy: asString(data.kycReviewedBy) || null,
  };
}

function buildTabQuery(db: FirebaseFirestore.Firestore, tab: KycTab): Query {
  const users = db.collection('users');
  if (tab === 'pending') {
    return users.where('status', '==', 'pending_kyc_review');
  }
  if (tab === 'rejected') {
    return users.where('status', '==', 'rejected');
  }
  return users.where('status', '==', 'active');
}

function matchesTab(item: KycListItem, tab: KycTab): boolean {
  if (tab === 'pending') return item.status === 'pending_kyc_review';
  if (tab === 'rejected') return item.status === 'rejected';
  return item.status === 'active' && Boolean(item.govIdType);
}

async function scanKycStatusDocs(status: string) {
  return getAdminFirestore()
    .collection('users')
    .where('status', '==', status)
    .select(...KYC_ELIGIBILITY_SELECT)
    .limit(MAX_KYC_SCAN)
    .get();
}

export async function listKycSubmissions(params: KycListParams = {}) {
  const tab = params.tab || 'pending';
  const search = (params.search || '').trim().toLowerCase();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 25) || 25));
  const includeMedia = params.includeMedia === true;
  const selectFields = includeMedia ? [...KYC_SELECT] : KYC_SELECT.filter((field) => field !== 'govIdFrontUrl');

  const db = getAdminFirestore();
  const snap = await buildTabQuery(db, tab).select(...selectFields).limit(MAX_KYC_SCAN).get();

  let items = snap.docs
    .filter((doc) => isActiveKycCivilian((doc.data() || {}) as Record<string, unknown>))
    .map((doc) => mapKycItem(doc.id, (doc.data() || {}) as Record<string, unknown>, includeMedia))
    .filter((item) => matchesTab(item, tab));

  if (search) {
    items = items.filter((item) =>
      [item.name, item.email, item.phone].join(' ').toLowerCase().includes(search)
    );
  }

  items.sort((a, b) => {
    const aMs = a.kycSubmittedAt ? new Date(a.kycSubmittedAt).getTime() : 0;
    const bMs = b.kycSubmittedAt ? new Date(b.kycSubmittedAt).getTime() : 0;
    return bMs - aMs;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export async function getKycApplicant(uid: string): Promise<KycListItem | null> {
  const snap = await getAdminFirestore().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const data = (snap.data() || {}) as Record<string, unknown>;
  if (!isActiveKycCivilian(data)) return null;
  if (!resolveKycBucket(data)) return null;
  return mapKycItem(snap.id, data, true);
}

/** Canonical KYC bucket totals — same eligibility rules as the review table. */
export async function countKycBuckets() {
  const [pendingSnap, rejectedSnap, activeSnap] = await Promise.all([
    scanKycStatusDocs('pending_kyc_review'),
    scanKycStatusDocs('rejected'),
    scanKycStatusDocs('active'),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const snap of [pendingSnap, rejectedSnap, activeSnap]) {
    for (const doc of snap.docs) {
      const bucket = resolveKycBucket((doc.data() || {}) as Record<string, unknown>);
      if (bucket) counts[bucket] += 1;
    }
  }

  return counts;
}

/**
 * Records that inflate legacy KYC counters but are excluded from the review table.
 * Typical cause: soft-deleted civilian (`deleted: true`) with an approved KYC status.
 */
export async function findStaleKycCounterRecords() {
  const [pendingSnap, rejectedSnap, activeSnap] = await Promise.all([
    scanKycStatusDocs('pending_kyc_review'),
    scanKycStatusDocs('rejected'),
    scanKycStatusDocs('active'),
  ]);

  const stale: Array<{
    id: string;
    status: string;
    reason: 'deleted_profile' | 'non_civilian_role' | 'missing_gov_id';
  }> = [];

  for (const snap of [pendingSnap, rejectedSnap, activeSnap]) {
    for (const doc of snap.docs) {
      const data = (doc.data() || {}) as Record<string, unknown>;
      if (resolveKycBucket(data)) continue;

      const status = asString(data.status);
      const isKycStatus =
        status === 'pending_kyc_review' ||
        status === 'rejected' ||
        (status === 'active' && Boolean(asString(data.govIdType)));
      if (!isKycStatus) continue;

      if (data.deleted === true) {
        stale.push({ id: doc.id, status, reason: 'deleted_profile' });
      } else if (mapRoleAlias(data.role) !== 'civilian') {
        stale.push({ id: doc.id, status, reason: 'non_civilian_role' });
      } else if (status === 'active' && !asString(data.govIdType)) {
        stale.push({ id: doc.id, status, reason: 'missing_gov_id' });
      }
    }
  }

  return stale;
}

/**
 * Archive civilian KYC profiles whose Auth account no longer exists (orphaned Firestore docs).
 * Safe for audit: marks the profile deleted instead of removing historical references.
 */
export async function archiveOrphanedKycUserDocs(input?: { actorUid?: string }) {
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const [pendingSnap, rejectedSnap, activeSnap] = await Promise.all([
    scanKycStatusDocs('pending_kyc_review'),
    scanKycStatusDocs('rejected'),
    scanKycStatusDocs('active'),
  ]);

  const seen = new Set<string>();
  const archivedIds: string[] = [];

  for (const snap of [pendingSnap, rejectedSnap, activeSnap]) {
    for (const doc of snap.docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);

      const data = (doc.data() || {}) as Record<string, unknown>;
      if (!isActiveKycCivilian(data)) continue;
      if (!resolveKycBucket(data)) continue;

      try {
        await auth.getUser(doc.id);
      } catch {
        await db.doc(`users/${doc.id}`).set(
          {
            deleted: true,
            userDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: input?.actorUid || null,
            deletedReason: 'Orphaned KYC profile (Auth account missing)',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        archivedIds.push(doc.id);
      }
    }
  }

  return { archivedIds, archivedCount: archivedIds.length };
}
