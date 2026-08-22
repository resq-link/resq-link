import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore, setAccountRoleClaims } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import {
  asString,
  httpErrorStatus,
  isResponderDesignation,
  resolveManagedAccount,
} from '@/lib/server/accounts';
import { assertAssignableAgencyCode } from '@/lib/server/agencies';
import { normalizeAgencyCode } from '@/lib/agencyTypes';
import { publicErrorMessage } from '@/lib/errors';

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const accountType = body.accountType === 'responder' ? 'responder' : 'dispatcher';
    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const account = await resolveManagedAccount(uid, accountType);
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const fullName = optionalString(body.fullName);
    if (fullName !== undefined) {
      changes.fullName = { from: asString(account.data.fullName), to: fullName };
      updates.fullName = fullName || '';
    }

    const agency = body.agency;
    if (agency !== undefined) {
      let agencyCode: string;
      try {
        const currentAgency = normalizeAgencyCode(asString(account.data.role));
        const nextAgency = normalizeAgencyCode(typeof agency === 'string' ? agency : '');
        agencyCode = await assertAssignableAgencyCode(agency, {
          allowInactive: Boolean(currentAgency) && currentAgency === nextAgency,
        });
      } catch (error) {
        const status = (error as { status?: number }).status || 400;
        return NextResponse.json({ error: (error as Error).message }, { status });
      }
      changes.agency = { from: asString(account.data.role), to: agencyCode };
      updates.role = agencyCode;
    }

    const teamCode = optionalString(body.teamCode);
    const teamLabel = optionalString(body.teamLabel);
    if (teamCode !== undefined) {
      changes.teamCode = { from: asString(account.data.teamCode), to: teamCode };
      updates.teamCode = teamCode;
    }
    if (teamLabel !== undefined) {
      changes.teamLabel = { from: asString(account.data.teamLabel), to: teamLabel };
      updates.teamLabel = teamLabel;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await getAdminFirestore().doc(`dispatchers/${uid}`).set(updates, { merge: true });

    const nextAgency =
      typeof updates.role === 'string' ? updates.role : asString(account.data.role);
    const designation = isResponderDesignation(account.data.designation) ? 'responder' : 'dispatcher';
    if (nextAgency) {
      await setAccountRoleClaims(uid, {
        role: designation,
        agency: nextAgency,
      });
    }

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.update_staff',
      targetUid: uid,
      targetLabel: account.label,
      targetCollection: 'dispatchers',
      metadata: { accountType, changes },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Unable to update this account. Please try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
