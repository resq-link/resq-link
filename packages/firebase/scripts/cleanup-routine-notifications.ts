/**
 * Delete Super Admin inbox rows that are routine CRUD / non-actionable.
 * Keeps types that shouldNotify() allows (KYC queue, operational, security/system).
 *
 * Usage (from packages/firebase):
 *   npx ts-node scripts/cleanup-routine-notifications.ts
 *   npx ts-node scripts/cleanup-routine-notifications.ts --dry-run
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });

import * as admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

/** Mirror of SUPER_ADMIN_NOTIFY_TYPES — keep inbox actionable only. */
const KEEP_TYPES = new Set([
  'kyc.submitted',
  'kyc.resubmitted',
  'incident.reported',
  'incident.escalated',
  'incident.reassigned',
  'incident.attention',
  'dispatch.failed',
  'push.delivery_failed',
  'account.reset_password',
  'system.notice',
  'system.security',
  'system.failure',
]);

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount =
      typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  throw new Error(
    'Missing Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS).'
  );
}

async function main() {
  console.log(
    DRY_RUN
      ? 'DRY RUN — listing routine notifications that would be removed.\n'
      : 'LIVE DELETE — removing routine CRUD notifications from Super Admin inbox.\n'
  );

  const db = getAdminApp().firestore();
  const snap = await db.collection('adminNotifications').get();
  const toDelete: admin.firestore.DocumentReference[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const type = typeof data.type === 'string' ? data.type : '';
    if (KEEP_TYPES.has(type)) {
      console.log(`  keep ${docSnap.id} — ${type} / ${String(data.title || '')}`);
      continue;
    }
    toDelete.push(docSnap.ref);
    console.log(
      `  ${DRY_RUN ? 'would delete' : 'deleted'} ${docSnap.id} — ${type || '(no type)'} / ${String(data.title || '')} / ${String(data.message || '').slice(0, 72)}`
    );
  }

  if (!DRY_RUN && toDelete.length > 0) {
    const CHUNK = 400;
    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const batch = db.batch();
      for (const ref of toDelete.slice(i, i + CHUNK)) batch.delete(ref);
      await batch.commit();
    }
  }

  const remaining = DRY_RUN
    ? snap.size - toDelete.length
    : (await db.collection('adminNotifications').get()).size;

  console.log('\n---');
  console.log(`Scanned:    ${snap.size}`);
  console.log(`Removed:    ${toDelete.length}`);
  console.log(`Remaining:  ${remaining}`);
  console.log(DRY_RUN ? '\nDry run complete.' : '\nRoutine notifications removed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
