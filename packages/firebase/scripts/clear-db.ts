import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';

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
      return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Must be valid JSON or base64-encoded JSON.');
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  const serviceAccountPath = resolve(__dirname, '../service-account.json');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch {
    throw new Error(
      'Missing Firebase Admin credentials. Create packages/firebase/.env with either:\n' +
        '  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
        '  OR\n' +
        '  GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json\n' +
        '  OR place service-account.json in packages/firebase/'
    );
  }
}

async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string
): Promise<number> {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
  return snapshot.size;
}

async function deleteIncidentWithSubcollections(
  db: admin.firestore.Firestore,
  incidentId: string,
  referenceNumber?: string
): Promise<void> {
  const historyDeleted = await deleteCollection(db, `incidents/${incidentId}/teamAssignmentHistory`);
  if (historyDeleted > 0) {
    console.log(`  - removed ${historyDeleted} team assignment history entries`);
  }

  await db.collection('incidents').doc(incidentId).delete();
  console.log(`Deleted incident: ${incidentId}${referenceNumber ? ` (${referenceNumber})` : ''}`);
}

async function clearDatabase() {
  console.log('Initializing Firebase Admin SDK...');
  const app = getAdminApp();
  const db = app.firestore();

  console.log('\nClearing incident dispatch ledger...');
  const dispatchCount = await deleteCollection(db, 'incidentDispatches');
  console.log(`Deleted ${dispatchCount} incident dispatch records.`);

  console.log('\nFetching all master incidents...');
  const incidentsSnapshot = await db.collection('incidents').get();
  console.log(`Found ${incidentsSnapshot.size} incidents. Deleting...`);

  for (const docSnap of incidentsSnapshot.docs) {
    const data = docSnap.data();
    await deleteIncidentWithSubcollections(db, docSnap.id, data.referenceNumber);
  }
  console.log('All incidents deleted successfully!');

  console.log('\nFetching all emergencies...');
  const emergenciesSnapshot = await db.collection('emergencies').get();
  console.log(`Found ${emergenciesSnapshot.size} emergencies. Deleting...`);

  const emergencyDeletes = emergenciesSnapshot.docs.map((docSnap) => {
    console.log(`Deleting emergency report: ${docSnap.id}`);
    return docSnap.ref.delete();
  });
  await Promise.all(emergencyDeletes);
  console.log('All emergencies deleted successfully!');

  console.log(
    '\nClean slate! Intake, Active Incidents, History, and Reports will show no incident data.'
  );
  console.log('User accounts, teams, resources, and incident type rules were not modified.');
}

clearDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
