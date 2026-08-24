/**
 * Clean operational app data for a fresh slate while preserving config/accounts.
 *
 * Deletes:
 * - emergencies (intake + history)
 * - incidents (+ teamAssignmentHistory subcollections)
 * - incidentDispatches
 * - smsIntakes, smsThreads, smsMessages
 * - advisories
 * - Storage files under emergencies/photos/ (action / on-scene / intake photos)
 *
 * Does NOT delete:
 * - incidentTypeRules
 * - users, dispatchers, commandCenters, admins
 * - agencies, teams, resources
 * - auditLogs, adminNotifications
 * - callSessions, footageRequests, chatThreads, incidentChats
 *
 * Usage (from packages/firebase):
 *   npx ts-node scripts/cleanup-app-data.ts --dry-run
 *   npx ts-node scripts/cleanup-app-data.ts
 *   npx ts-node scripts/cleanup-app-data.ts --skip-storage
 */

import * as dotenv from 'dotenv';
import { isAbsolute, resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });

import * as admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_STORAGE = process.argv.includes('--skip-storage');
const BATCH_SIZE = 400;
const STORAGE_PREFIX = 'emergencies/photos/';
const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'city-rescue-dispatch.firebasestorage.app';

const COLLECTIONS_TO_CLEAR = [
  'incidentDispatches',
  'smsIntakes',
  'smsThreads',
  'smsMessages',
  'advisories',
] as const;

function initOptions(
  credential?: admin.credential.Credential
): admin.AppOptions {
  return {
    ...(credential ? { credential } : {}),
    storageBucket: STORAGE_BUCKET,
  };
}

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount =
        typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
          ? JSON.parse(serviceAccountJson)
          : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
      return admin.initializeApp(
        initOptions(admin.credential.cert(serviceAccount))
      );
    } catch {
      throw new Error(
        'Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Must be valid JSON or base64-encoded JSON.'
      );
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = isAbsolute(credPath)
      ? credPath
      : resolve(__dirname, '..', credPath);
    return admin.initializeApp(initOptions());
  }

  // Fallbacks: common local filenames under packages/firebase/
  const fallbackNames = [
    'service-account.json',
    'city-rescue-dispatch-firebase-adminsdk-fbsvc-5835f9089a.json',
  ];
  for (const name of fallbackNames) {
    const serviceAccountPath = resolve(__dirname, '..', name);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(serviceAccountPath);
      return admin.initializeApp(
        initOptions(admin.credential.cert(serviceAccount))
      );
    } catch {
      // try next
    }
  }

  throw new Error(
    'Missing Firebase Admin credentials. Create packages/firebase/.env with either:\n' +
      '  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
      '  OR\n' +
      '  GOOGLE_APPLICATION_CREDENTIALS=./your-adminsdk.json\n' +
      '  OR place the adminsdk JSON in packages/firebase/'
  );
}

async function commitDeletesInBatches(
  db: admin.firestore.Firestore,
  refs: admin.firestore.DocumentReference[]
): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + BATCH_SIZE)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

async function clearCollection(
  db: admin.firestore.Firestore,
  collectionPath: string
): Promise<number> {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) {
    console.log(`  ${collectionPath}: 0 documents`);
    return 0;
  }

  console.log(
    `  ${collectionPath}: ${snapshot.size} document(s) ${DRY_RUN ? 'would be deleted' : 'deleting...'}`
  );

  if (!DRY_RUN) {
    await commitDeletesInBatches(
      db,
      snapshot.docs.map((docSnap) => docSnap.ref)
    );
  }

  return snapshot.size;
}

async function clearIncidents(db: admin.firestore.Firestore): Promise<{
  incidents: number;
  teamHistory: number;
}> {
  const snapshot = await db.collection('incidents').get();
  console.log(
    `  incidents: ${snapshot.size} document(s) ${DRY_RUN ? 'would be deleted' : 'deleting...'}`
  );

  let teamHistory = 0;

  for (const docSnap of snapshot.docs) {
    const historyPath = `incidents/${docSnap.id}/teamAssignmentHistory`;
    const historySnap = await db.collection(historyPath).get();
    teamHistory += historySnap.size;

    if (!DRY_RUN) {
      if (!historySnap.empty) {
        await commitDeletesInBatches(
          db,
          historySnap.docs.map((h) => h.ref)
        );
      }
      await docSnap.ref.delete();
    }

    const refNum = docSnap.data().referenceNumber;
    console.log(
      `    ${DRY_RUN ? 'would delete' : 'deleted'} incident ${docSnap.id}${
        refNum ? ` (${refNum})` : ''
      }${historySnap.size > 0 ? ` + ${historySnap.size} team history` : ''}`
    );
  }

  return { incidents: snapshot.size, teamHistory };
}

async function clearEmergencies(db: admin.firestore.Firestore): Promise<number> {
  return clearCollection(db, 'emergencies');
}

async function clearStoragePhotos(
  // firebase-admin v10: Bucket lives on @google-cloud/storage, not admin.storage
  bucket: ReturnType<ReturnType<admin.app.App['storage']>['bucket']>
): Promise<number> {
  console.log(
    `\nStorage ${STORAGE_PREFIX}: ${DRY_RUN ? 'scanning...' : 'deleting...'}`
  );

  const [files] = await bucket.getFiles({ prefix: STORAGE_PREFIX });
  if (files.length === 0) {
    console.log('  0 files');
    return 0;
  }

  console.log(
    `  ${files.length} file(s) ${DRY_RUN ? 'would be deleted' : 'deleting...'}`
  );

  if (!DRY_RUN) {
    // deleteFiles can fail on empty prefix edge cases; delete in chunks for reliability
    const CHUNK = 100;
    for (let i = 0; i < files.length; i += CHUNK) {
      await Promise.all(
        files.slice(i, i + CHUNK).map((file: (typeof files)[number]) =>
          file.delete({ ignoreNotFound: true })
        )
      );
    }
  }

  return files.length;
}

async function main() {
  console.log(
    DRY_RUN
      ? 'DRY RUN — no deletions will be written.\n'
      : 'LIVE DELETE — removing operational app data.\n'
  );

  if (SKIP_STORAGE) {
    console.log('(--skip-storage) Storage files under emergencies/photos/ will be left alone.\n');
  }

  console.log('Initializing Firebase Admin SDK...');
  const app = getAdminApp();
  const db = app.firestore();

  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    (app.options.projectId as string | undefined) ||
    'unknown';
  console.log(`Firebase project: ${projectId}`);

  console.log('\n--- Firestore ---');

  const counts: Record<string, number> = {};

  counts.incidentDispatches = await clearCollection(db, 'incidentDispatches');

  const incidentResult = await clearIncidents(db);
  counts.incidents = incidentResult.incidents;
  counts.teamAssignmentHistory = incidentResult.teamHistory;

  counts.emergencies = await clearEmergencies(db);

  for (const name of COLLECTIONS_TO_CLEAR.filter((c) => c !== 'incidentDispatches')) {
    counts[name] = await clearCollection(db, name);
  }

  let storageCount = 0;
  if (!SKIP_STORAGE) {
    try {
      const bucket = app.storage().bucket(STORAGE_BUCKET);
      storageCount = await clearStoragePhotos(bucket);
    } catch (error) {
      console.log(
        `\nStorage cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log('Re-run with --skip-storage to clear Firestore only, or fix Storage credentials.');
    }
  }

  console.log('\n--- Summary ---');
  console.log(`incidentDispatches:     ${counts.incidentDispatches}`);
  console.log(`incidents:              ${counts.incidents}`);
  console.log(`teamAssignmentHistory:  ${counts.teamAssignmentHistory}`);
  console.log(`emergencies:            ${counts.emergencies}`);
  console.log(`smsIntakes:             ${counts.smsIntakes}`);
  console.log(`smsThreads:             ${counts.smsThreads}`);
  console.log(`smsMessages:            ${counts.smsMessages}`);
  console.log(`advisories:             ${counts.advisories}`);
  if (!SKIP_STORAGE) {
    console.log(`storage photos:         ${storageCount}`);
  }

  console.log(
    '\nPreserved: incidentTypeRules, users/dispatchers/admins/commandCenters, agencies, teams, resources.'
  );
  console.log(
    DRY_RUN
      ? '\nDry run complete. Re-run without --dry-run to delete.'
      : '\nApp data cleanup complete.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
