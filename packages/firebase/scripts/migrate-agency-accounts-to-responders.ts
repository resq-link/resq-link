/**
 * Reclassify agency mobile-app accounts as responders.
 *
 * Preserves Auth UIDs, emails, passwords, and agency codes (`dispatchers.role`).
 * Updates Firestore `designation` + Auth custom claims `role` to `responder`.
 *
 * Usage (from packages/firebase):
 *   npx ts-node scripts/migrate-agency-accounts-to-responders.ts
 *
 * Or from apps/resq-link-web-app (loads .env.local via dotenv if present):
 *   npx ts-node --project ../../packages/firebase/tsconfig.json ../../packages/firebase/scripts/migrate-agency-accounts-to-responders.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });

import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore, setAccountRoleClaims, writeAuditLog } from '../src/admin';

const RESPONDER_ACCOUNTS: Array<{ email: string; agencyCode: string }> = [
  { email: 'bfp@rescue.ph', agencyCode: 'BFP' },
  { email: 'ems@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'hospital@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'pnp@rescue.ph', agencyCode: 'PNP' },
  { email: 'mdrrmo@rescue.ph', agencyCode: 'MDRRMO' },
  { email: 'ambulance@rescue.ph', agencyCode: 'AMBULANCE' },
  { email: 'pcg@rescue.ph', agencyCode: 'PCG' },
];

async function main() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const account of RESPONDER_ACCOUNTS) {
    try {
      const user = await auth.getUserByEmail(account.email);
      const ref = db.doc(`dispatchers/${user.uid}`);
      const snap = await ref.get();
      if (!snap.exists) {
        console.log(`MISSING_DOC:${account.email}:${user.uid}`);
        missing += 1;
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
      const agencyMatches = previousAgency === account.agencyCode;

      if (alreadyResponder && agencyMatches) {
        await setAccountRoleClaims(user.uid, {
          role: 'responder',
          agency: account.agencyCode,
        });
        console.log(`SKIP:${account.email}:already_responder`);
        skipped += 1;
        continue;
      }

      await ref.set(
        {
          designation: 'responder',
          role: account.agencyCode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await setAccountRoleClaims(user.uid, {
        role: 'responder',
        agency: account.agencyCode,
      });

      await writeAuditLog({
        actorUid: 'system',
        actorEmail: 'system@resq-link.local',
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

      console.log(
        `UPDATED:${account.email}:${user.uid}:designation ${previousDesignation}->responder agency ${previousAgency}->${account.agencyCode}`
      );
      updated += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('auth/user-not-found') || message.includes('There is no user record')) {
        console.log(`MISSING_AUTH:${account.email}`);
        missing += 1;
        continue;
      }
      console.log(`ERROR:${account.email}:${message}`);
    }
  }

  console.log(`DONE updated=${updated} skipped=${skipped} missing=${missing}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
