import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { mapAgencyDoc } from '@/lib/server/agencies';
import { AGENCY_TYPE_OPTIONS, type AgencyType } from '@/lib/agencyTypes';
import { publicErrorMessage } from '@/lib/errors';

function isAgencyType(value: unknown): value is AgencyType {
  return typeof value === 'string' && AGENCY_TYPE_OPTIONS.some((item) => item.value === value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const code = decodeURIComponent(id).trim().toUpperCase();
    const db = getAdminFirestore();
    const ref = db.doc(`agencies/${code}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const current = snap.data() || {};
    const body = await request.json();
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const name = optionalString(body.name);
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
      changes.name = { from: current.name || null, to: name };
      updates.name = name;
    }

    if (body.type !== undefined) {
      if (!isAgencyType(body.type)) {
        return NextResponse.json({ error: 'Invalid agency type' }, { status: 400 });
      }
      changes.type = { from: current.type || null, to: body.type };
      updates.type = body.type;
    }

    for (const field of ['contactPhone'] as const) {
      if (body[field] !== undefined) {
        const next = optionalString(body[field]) ?? '';
        changes[field] = { from: current[field] || '', to: next };
        updates[field] = next;
      }
    }

    if (body.isActive !== undefined) {
      const next = Boolean(body.isActive);
      changes.isActive = { from: current.isActive !== false, to: next };
      updates.isActive = next;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await ref.set(updates, { merge: true });
    const nextSnap = await ref.get();
    const item = mapAgencyDoc(code, nextSnap.data() as Record<string, unknown>);

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'agency.update',
      targetUid: code,
      targetLabel: `${item.name} (${item.code})`,
      targetCollection: 'agencies',
      metadata: { changes },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to update agency.') },
      { status: 500 }
    );
  }
}
