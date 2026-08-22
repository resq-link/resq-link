import { getAdminFirestore } from '@packages/firebase/admin';
import { normalizeAgencyCode } from '@/lib/agencyTypes';
import { countDocuments } from '@/lib/server/firestoreCount';
import { toIso } from '@/lib/server/timestamps';
import type { DashboardStats, PersonnelByAgencyRow } from '@/lib/accountTypes';

function monthStartDate(): Date {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

async function countIncompleteCommandCenters(): Promise<number> {
  const snap = await getAdminFirestore().collection('commandCenters').select('name', 'location').get();
  let incomplete = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (!String(data.name || '').trim() || !String(data.location || '').trim()) {
      incomplete += 1;
    }
  });
  return incomplete;
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const started = Date.now();
  const monthStart = monthStartDate();

  const [
    civilians,
    civiliansThisMonth,
    pendingKyc,
    disabledCivilians,
    staffTotal,
    responderTotal,
    disabledStaff,
    disabledResponders,
    commandCenters,
    disabledCenters,
    agenciesTotal,
    inactiveAgencies,
    incompleteCommandCenters,
  ] = await Promise.all([
    countDocuments('users'),
    countDocuments('users', [{ field: 'createdAt', op: '>=', value: monthStart }]),
    countDocuments('users', [{ field: 'status', op: '==', value: 'pending_kyc_review' }]),
    countDocuments('users', [{ field: 'disabled', op: '==', value: true }]),
    countDocuments('dispatchers'),
    countDocuments('dispatchers', [{ field: 'designation', op: '==', value: 'responder' }]),
    countDocuments('dispatchers', [{ field: 'active', op: '==', value: false }]),
    countDocuments('dispatchers', [
      { field: 'designation', op: '==', value: 'responder' },
      { field: 'active', op: '==', value: false },
    ]),
    countDocuments('commandCenters'),
    countDocuments('commandCenters', [{ field: 'disabled', op: '==', value: true }]),
    countDocuments('agencies'),
    countDocuments('agencies', [{ field: 'isActive', op: '==', value: false }]),
    countIncompleteCommandCenters().catch((error) => {
      console.error('incomplete command centers count failed', error);
      return 0;
    }),
  ]);

  const dispatcherTotal = Math.max(0, staffTotal - responderTotal);
  const disabledDispatcher = Math.max(0, disabledStaff - disabledResponders);

  const stats: DashboardStats = {
    civilians: { total: civilians, thisMonth: civiliansThisMonth },
    responders: {
      total: responderTotal,
      active: Math.max(0, responderTotal - disabledResponders),
    },
    dispatchers: {
      total: dispatcherTotal,
      active: Math.max(0, dispatcherTotal - disabledDispatcher),
    },
    commandCenters: {
      total: commandCenters,
      active: Math.max(0, commandCenters - disabledCenters),
    },
    agencies: {
      total: agenciesTotal,
      active: Math.max(0, agenciesTotal - inactiveAgencies),
    },
    pendingKyc,
    disabledAccounts: disabledStaff + disabledCivilians + disabledCenters,
    incompleteCommandCenters,
  };

  if (process.env.NODE_ENV === 'development') {
    console.info(`[admin-dashboard] stats ${Date.now() - started}ms`);
  }

  return stats;
}

export async function loadPersonnelByAgency(): Promise<PersonnelByAgencyRow[]> {
  const started = Date.now();
  const db = getAdminFirestore();
  const [staffSnap, agenciesSnap] = await Promise.all([
    db.collection('dispatchers').select('role').get(),
    db.collection('agencies').select('code', 'name').get(),
  ]);

  const personnelCounts: Record<string, number> = {};
  staffSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const code = normalizeAgencyCode(String(data.role || ''));
    if (!code) return;
    personnelCounts[code] = (personnelCounts[code] || 0) + 1;
  });

  const agencyByCode = new Map<string, string>();
  agenciesSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const code = normalizeAgencyCode(String(data.code || doc.id));
    const name = typeof data.name === 'string' && data.name.trim() ? data.name : code;
    if (code) agencyByCode.set(code, name);
  });

  const rows = Object.entries(personnelCounts)
    .map(([code, total]) => ({
      code,
      name: agencyByCode.get(code) || code,
      total,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  if (process.env.NODE_ENV === 'development') {
    console.info(
      `[admin-dashboard] personnel ${Date.now() - started}ms (${staffSnap.size} staff docs)`
    );
  }

  return rows;
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
