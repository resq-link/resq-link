import type { Query } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@packages/firebase/admin';
import { toIso } from '@/lib/server/timestamps';
import type { AuditLogRecord } from '@/lib/accountTypes';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export interface AuditListParams {
  search?: string;
  action?: string;
  targetType?: string;
  page?: number;
  pageSize?: number;
}

function mapAuditDoc(id: string, data: Record<string, unknown>): AuditLogRecord {
  return {
    id,
    actorUid: asString(data.actorUid),
    actorEmail: asString(data.actorEmail) || null,
    action: asString(data.action),
    targetUid: asString(data.targetUid) || null,
    targetLabel: asString(data.targetLabel) || null,
    targetCollection: asString(data.targetCollection) || null,
    reason: asString(data.reason) || null,
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : null,
    createdAt: toIso(data.createdAt),
  };
}

export async function listAuditLogs(params: AuditListParams) {
  const search = (params.search || '').trim().toLowerCase();
  const action = (params.action || '').trim();
  const targetType = (params.targetType || '').trim();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 25) || 25));
  const hasFilters = Boolean(search || action || targetType);

  const db = getAdminFirestore();
  let query: Query = db.collection('auditLogs');

  if (action) query = query.where('action', '==', action);
  if (targetType) query = query.where('targetCollection', '==', targetType);

  const fetchLimit = hasFilters ? Math.min(500, page * pageSize + pageSize) : pageSize;
  let snap;
  try {
    snap = await query.orderBy('createdAt', 'desc').limit(fetchLimit).get();
  } catch (error) {
    console.error('auditLogs ordered query failed', error);
    snap = await query.limit(fetchLimit).get();
  }

  let items = snap.docs.map((doc) => mapAuditDoc(doc.id, (doc.data() || {}) as Record<string, unknown>));

  if (search) {
    items = items.filter((row) => {
      const blob = [row.actorEmail, row.action, row.targetLabel, row.targetUid, row.reason]
        .join(' ')
        .toLowerCase();
      return blob.includes(search);
    });
  }

  items.sort((a, b) => {
    const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bMs - aMs;
  });

  const total = hasFilters ? items.length : Math.max(items.length, page * pageSize);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    hasMore: !hasFilters && snap.size === pageSize,
  };
}
