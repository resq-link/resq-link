import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import {
  getAdminAuth,
  getAdminFirestore,
  setAccountRoleClaims,
} from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { publicErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const RESPONDER_ACCOUNTS: Array<{ email: string; agencyCode: string }> = [
  { email: 'bfp@rescue.ph', agencyCode: 'BFP' },
  { email: 'ems@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'hospital@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'pnp@rescue.ph', agencyCode: 'PNP' },
  { email: 'mdrrmo@rescue.ph', agencyCode: 'MDRRMO' },
  { email: 'ambulance@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'pcg@rescue.ph', agencyCode: 'PCG' },
];

/**
 * One-shot (idempotent) migration: reclassify agency mobile accounts as responders.
 * Preserves Auth UIDs and credentials; updates Firestore designation + Auth claims.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const adminAuth = getAdminAuth();
    const db = getAdminFirestore();
    const results: Array<Record<string, unknown>> = [];

    for (const account of RESPONDER_ACCOUNTS) {
      try {
        const user = await adminAuth.getUserByEmail(account.email);
        const ref = db.doc(`dispatchers/${user.uid}`);
        const snap = await ref.get();
        if (!snap.exists) {
          results.push({ email: account.email, status: 'missing_doc', uid: user.uid });
          continue;
        }

        const data = snap.data() || {};
        const previousDesignation =
          typeof data.designation === 'string' && data.designation.trim()
            ? data.designation.trim()
            : 'dispatcher';
        const previousAgency =
          typeof data.role === 'string' && data.role.trim()
            ? data.role.trim().toUpperCase()
            : account.agencyCode;
        const alreadyResponder = previousDesignation.toLowerCase().includes('responder');

        if (!alreadyResponder || previousAgency !== account.agencyCode) {
          await ref.set(
            {
              designation: 'responder',
              role: account.agencyCode,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        await setAccountRoleClaims(user.uid, {
          role: 'responder',
          agency: account.agencyCode,
        });

        if (!alreadyResponder || previousAgency !== account.agencyCode) {
          await recordAudit({
            actorUid: auth.auth.uid,
            actorEmail: auth.auth.email,
            action: 'account.role_updated',
            targetUid: user.uid,
            targetLabel: account.email,
            targetCollection: 'dispatchers',
            metadata: {
              previousRole: previousDesignation,
              newRole: 'responder',
              previousAgency,
              agencyCode: account.agencyCode,
              email: account.email,
            },
          });
        }

        results.push({
          email: account.email,
          uid: user.uid,
          status: alreadyResponder && previousAgency === account.agencyCode ? 'skipped' : 'updated',
          previousDesignation,
          agencyCode: account.agencyCode,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          email: account.email,
          status: message.includes('auth/user-not-found') ? 'missing_auth' : 'error',
          error: message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.filter((row) => row.status === 'updated').length,
      skipped: results.filter((row) => row.status === 'skipped').length,
      results,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to migrate responder roles.') },
      { status: 500 }
    );
  }
}
