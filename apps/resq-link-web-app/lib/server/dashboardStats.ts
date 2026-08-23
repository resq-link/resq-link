import { getAdminFirestore } from '@packages/firebase/admin';
import { countDocuments } from '@/lib/server/firestoreCount';
import { toIso } from '@/lib/server/timestamps';
import type { DashboardStats } from '@/lib/accountTypes';

function monthStartDate(): Date {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const started = Date.now();
  const monthStart = monthStartDate();

  const [
    civilians,
    civiliansThisMonth,
    pendingKyc,
    disabledCivilians,
    dispatcherTotal,
    disabledDispatchers,
    responderTotal,
    disabledResponders,
    disabledStaff,
    agenciesTotal,
    inactiveAgencies,
  ] = await Promise.all([
    countDocuments('users'),
    countDocuments('users', [{ field: 'createdAt', op: '>=', value: monthStart }]),
    countDocuments('users', [{ field: 'status', op: '==', value: 'pending_kyc_review' }]),
    countDocuments('users', [{ field: 'disabled', op: '==', value: true }]),
    // Web dispatcher operators (Command Center accounts)
    countDocuments('commandCenters'),
    countDocuments('commandCenters', [{ field: 'disabled', op: '==', value: true }]),
    // Mobile responder / agency accounts
    countDocuments('dispatchers', [{ field: 'designation', op: '==', value: 'responder' }]),
    countDocuments('dispatchers', [
      { field: 'designation', op: '==', value: 'responder' },
      { field: 'active', op: '==', value: false },
    ]),
    countDocuments('dispatchers', [{ field: 'active', op: '==', value: false }]),
    countDocuments('agencies'),
    countDocuments('agencies', [{ field: 'isActive', op: '==', value: false }]),
  ]);

  const stats: DashboardStats = {
    civilians: { total: civilians, thisMonth: civiliansThisMonth },
    responders: {
      total: responderTotal,
      active: Math.max(0, responderTotal - disabledResponders),
    },
    dispatchers: {
      total: dispatcherTotal,
      active: Math.max(0, dispatcherTotal - disabledDispatchers),
    },
    agencies: {
      total: agenciesTotal,
      active: Math.max(0, agenciesTotal - inactiveAgencies),
    },
    pendingKyc,
    disabledAccounts: disabledStaff + disabledCivilians + disabledDispatchers,
  };

  if (process.env.NODE_ENV === 'development') {
    console.info(`[admin-dashboard] stats ${Date.now() - started}ms`);
  }

  return stats;
}

export async function loadRecentActivity(limitCount = 8): Promise<
  Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    targetLabel: string | null;
    createdAt: string | null;
  }>
> {
  const started = Date.now();
  try {
    const recentAuditSnap = await getAdminFirestore()
      .collection('auditLogs')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    const items = recentAuditSnap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        action: String(data.action || ''),
        actorEmail: typeof data.actorEmail === 'string' ? data.actorEmail : null,
        targetLabel: typeof data.targetLabel === 'string' ? data.targetLabel : null,
        createdAt: toIso(data.createdAt),
      };
    });
    if (process.env.NODE_ENV === 'development') {
      console.info(`[admin-dashboard] activity ${Date.now() - started}ms (${items.length} rows)`);
    }
    return items;
  } catch (error) {
    console.error('recent audit query failed', error);
    return [];
  }
}
