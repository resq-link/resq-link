import type { Query } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@packages/firebase/admin';
import { asString } from '@/lib/server/accounts';
import { countDocuments } from '@/lib/server/firestoreCount';
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
  'kycRejectionReason',
  'kycSubmittedAt',
  'kycReviewedAt',
  'kycReviewedBy',
  'govIdFrontUrl',
] as const;

export type KycTab = 'pending' | 'approved' | 'rejected';

export interface KycListParams {
  tab?: KycTab;
  search?: string;
  page?: number;
  pageSize?: number;
  includeMedia?: boolean;
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

export async function listKycSubmissions(params: KycListParams = {}) {
  const tab = params.tab || 'pending';
  const search = (params.search || '').trim().toLowerCase();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 25) || 25));
  const includeMedia = params.includeMedia === true;
  const selectFields = includeMedia ? [...KYC_SELECT] : KYC_SELECT.filter((field) => field !== 'govIdFrontUrl');

  const db = getAdminFirestore();
  const snap = await buildTabQuery(db, tab).select(...selectFields).limit(500).get();

  let items = snap.docs
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
  return mapKycItem(snap.id, (snap.data() || {}) as Record<string, unknown>, true);
}

export async function countKycBuckets() {
  const [pending, rejected, approvedCandidates] = await Promise.all([
    countDocuments('users', [{ field: 'status', op: '==', value: 'pending_kyc_review' }]),
    countDocuments('users', [{ field: 'status', op: '==', value: 'rejected' }]),
    getAdminFirestore()
      .collection('users')
      .where('status', '==', 'active')
      .select('govIdType')
      .limit(500)
      .get(),
  ]);

  const approved = approvedCandidates.docs.filter((doc) => {
    const data = doc.data() || {};
    return Boolean(asString(data.govIdType));
  }).length;

  return { pending, approved, rejected };
}
