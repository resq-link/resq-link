import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import {
  listAgenciesFromDb,
  mapAgencyDoc,
} from '@/lib/server/agencies';
import {
  AGENCY_TYPE_OPTIONS,
  isValidAgencyCodeFormat,
  finalizeAgencyCode,
  type AgencyType,
} from '@/lib/agencyTypes';
import { publicErrorMessage } from '@/lib/errors';

function isAgencyType(value: unknown): value is AgencyType {
  return typeof value === 'string' && AGENCY_TYPE_OPTIONS.some((item) => item.value === value);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const activeOnly = searchParams.get('activeOnly') === '1' || searchParams.get('activeOnly') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 25)));

    let items = await listAgenciesFromDb();

    if (activeOnly || status === 'active') {
      items = items.filter((item) => item.isActive);
    } else if (status === 'disabled') {
      items = items.filter((item) => !item.isActive);
    }

    if (type !== 'all') {
      items = items.filter((item) => item.type === type);
    }

    if (search) {
      items = items.filter((item) =>
        [item.name, item.code, item.contactPhone, item.type].join(' ').toLowerCase().includes(search)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return NextResponse.json({
      items: paged,
      total,
      page,
      pageSize,
      activeCount: items.filter((item) => item.isActive).length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load agencies.') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = finalizeAgencyCode(typeof body.code === 'string' ? body.code : '');
    const type = body.type;
    const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
    const isActive = body.isActive !== false;

    if (!name || !code) {
      return NextResponse.json({ error: 'Agency name and code are required' }, { status: 400 });
    }
    if (!isValidAgencyCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Agency code must be uppercase letters/numbers (2–32 chars).' },
        { status: 400 }
      );
    }
    if (!isAgencyType(type)) {
      return NextResponse.json({ error: 'Invalid agency type' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.doc(`agencies/${code}`);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({ error: 'An agency with this code already exists' }, { status: 409 });
    }

    // Keep optional historical fields as empty strings for document-shape compatibility.
    const payload = {
      name,
      code,
      type,
      description: '',
      contactEmail: '',
      contactPhone,
      address: '',
      isActive,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: auth.auth.uid,
    };
    await ref.set(payload);

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'agency.create',
      targetUid: code,
      targetLabel: `${name} (${code})`,
      targetCollection: 'agencies',
      metadata: { type, isActive },
    });

    const created = mapAgencyDoc(code, { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, item: created });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to create agency.') },
      { status: 500 }
    );
  }
}
