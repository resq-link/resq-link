/**
 * Delete records created by Super Admin QA scripts.
 *
 * Targets only:
 * - Auth users with email matching qa.*@rescue.ph
 * - Matching Firestore users/ and dispatchers/ docs
 * - Agencies with code QA###### or name "QA Temporary Agency"
 * - adminNotifications whose title/message/metadata clearly reference QA fixtures
 * - Audit log entries that reference those QA emails/agencies (best-effort)
 *
 * Does NOT delete permanent seed accounts (superadmin@, civilian@, bfp@, etc.)
 * or operational incident/emergency data.
 *
 * Usage (from packages/firebase):
 *   npx ts-node scripts/cleanup-qa-records.ts
 *   npx ts-node scripts/cleanup-qa-records.ts --dry-run
 *   npx ts-node scripts/cleanup-qa-records.ts --notifications-only
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });

import * as admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const NOTIFICATIONS_ONLY = process.argv.includes('--notifications-only');
const QA_EMAIL_RE = /^qa\.[a-z0-9._+-]+@rescue\.ph$/i;
const QA_AGENCY_CODE_RE = /^QA\d{4,}$/i;

/** True when a Super Admin inbox row is clearly from QA fixture traffic. */
function isQaAdminNotification(data: admin.firestore.DocumentData): boolean {
  const haystack = [
    data.title,
    data.message,
    data.targetId,
    data.eventKey,
    typeof data.metadata === 'object' && data.metadata ? JSON.stringify(data.metadata) : '',
  ]
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join(' ')
    .toLowerCase();

  if (!haystack) return false;

  return (
    haystack.includes('qa civilian') ||
    haystack.includes('qa temporary agency') ||
    haystack.includes('qa responder') ||
    haystack.includes('qa super admin') ||
    haystack.includes('should fail') ||
    haystack.includes('test deduplication') ||
    haystack.includes('test command center') ||
    /qa\.[a-z0-9._+-]+@rescue\.ph/i.test(haystack) ||
    /\bqa\d{4,}\b/i.test(haystack) ||
    /created by super admin qa/i.test(haystack) ||
    /"reason":"qa disable"/i.test(haystack)
  );
}

async function commitDeletesInBatches(
  db: admin.firestore.Firestore,
  refs: admin.firestore.DocumentReference[]
): Promise<void> {
  const CHUNK = 400;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + CHUNK)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

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

async function listQaAuthUsers(auth: admin.auth.Auth): Promise<admin.auth.UserRecord[]> {
  const matches: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const email = user.email || '';
      if (QA_EMAIL_RE.test(email)) {
        matches.push(user);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return matches;
}

async function deleteFirestoreDocIfExists(
  db: admin.firestore.Firestore,
  path: string
): Promise<boolean> {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if (!DRY_RUN) await ref.delete();
  return true;
}

async function cleanupQaNotifications(db: admin.firestore.Firestore): Promise<{
  matched: number;
  remaining: number;
}> {
  const snap = await db.collection('adminNotifications').get();
  const toDelete: admin.firestore.DocumentReference[] = [];

  console.log(`\nScanning ${snap.size} adminNotifications for QA fixtures...`);
  for (const docSnap of snap.docs) {
    if (!isQaAdminNotification(docSnap.data())) continue;
    toDelete.push(docSnap.ref);
    const data = docSnap.data();
    console.log(
      `  ${DRY_RUN ? 'would delete' : 'deleted'} ${docSnap.id} — ${String(data.title || '')} / ${String(data.message || '').slice(0, 80)}`
    );
  }

  if (!DRY_RUN && toDelete.length > 0) {
    await commitDeletesInBatches(db, toDelete);
  }

  const remainingSnap = DRY_RUN
    ? { size: snap.size - toDelete.length }
    : await db.collection('adminNotifications').get();

  return { matched: toDelete.length, remaining: remainingSnap.size };
}

async function main() {
  console.log(
    DRY_RUN
      ? 'DRY RUN — no deletions will be written.\n'
      : NOTIFICATIONS_ONLY
        ? 'LIVE DELETE — removing QA adminNotifications only.\n'
        : 'LIVE DELETE — removing QA testing records.\n'
  );

  const app = getAdminApp();
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    (app.options.projectId as string | undefined) ||
    'unknown';
  console.log(`Firebase project: ${projectId}`);

  const auth = app.auth();
  const db = app.firestore();

  let authDeleted = 0;
  let usersDeleted = 0;
  let dispatchersDeleted = 0;
  let agenciesDeleted = 0;
  let auditDeleted = 0;

  if (!NOTIFICATIONS_ONLY) {
    const qaUsers = await listQaAuthUsers(auth);
    console.log(`Found ${qaUsers.length} QA Auth user(s):`);
    for (const user of qaUsers) {
      console.log(`  - ${user.email} (${user.uid})`);
    }

    for (const user of qaUsers) {
      if (await deleteFirestoreDocIfExists(db, `users/${user.uid}`)) {
        usersDeleted += 1;
        console.log(`  deleted users/${user.uid}`);
      }
      if (await deleteFirestoreDocIfExists(db, `dispatchers/${user.uid}`)) {
        dispatchersDeleted += 1;
        console.log(`  deleted dispatchers/${user.uid}`);
      }
      if (!DRY_RUN) {
        await auth.deleteUser(user.uid);
      }
      authDeleted += 1;
      console.log(`  deleted Auth ${user.email}`);
    }

    const agenciesSnap = await db.collection('agencies').get();
    console.log(`\nScanning ${agenciesSnap.size} agencies for QA temporaries...`);
    for (const docSnap of agenciesSnap.docs) {
      const data = docSnap.data();
      const code = String(data.code || docSnap.id || '');
      const name = String(data.name || '');
      const isQa =
        QA_AGENCY_CODE_RE.test(code) ||
        /QA Temporary Agency/i.test(name) ||
        /Created by Super Admin QA/i.test(String(data.description || ''));

      if (!isQa) continue;

      if (!DRY_RUN) await docSnap.ref.delete();
      agenciesDeleted += 1;
      console.log(`  deleted agency ${code || docSnap.id} (${name})`);
    }

    try {
      const auditSnap = await db.collection('auditLogs').limit(500).get();
      const batch = db.batch();
      let batchCount = 0;

      for (const docSnap of auditSnap.docs) {
        const text = JSON.stringify(docSnap.data());
        if (
          /qa\.[a-z0-9._+-]+@rescue\.ph/i.test(text) ||
          /QA Temporary Agency/i.test(text) ||
          /Created by Super Admin QA/i.test(text) ||
          /"reason":"QA disable"/i.test(text) ||
          /QA Super Admin/i.test(text)
        ) {
          if (!DRY_RUN) batch.delete(docSnap.ref);
          auditDeleted += 1;
          batchCount += 1;
        }
      }

      if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
      }
      console.log(`\nAudit QA-related entries matched: ${auditDeleted}`);
    } catch (error) {
      console.log(`\nAudit cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const notifications = await cleanupQaNotifications(db);

  console.log('\n---');
  if (!NOTIFICATIONS_ONLY) {
    console.log(`Auth users:        ${authDeleted}`);
    console.log(`users/ docs:       ${usersDeleted}`);
    console.log(`dispatchers/ docs: ${dispatchersDeleted}`);
    console.log(`agencies:          ${agenciesDeleted}`);
    console.log(`audit rows:        ${auditDeleted}`);
  }
  console.log(`QA notifications:  ${notifications.matched}`);
  console.log(`Notifications left: ${notifications.remaining}`);
  console.log(
    DRY_RUN ? '\nDry run complete. Re-run without --dry-run to delete.' : '\nQA testing records removed.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
