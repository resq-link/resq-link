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

  throw new Error(
    'Missing Firebase Admin credentials. Create packages/firebase/.env with either:\n' +
      '  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
      '  OR\n' +
      '  GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json'
  );
}

async function clearDatabase() {
  console.log("Initializing Firebase Admin SDK...");
  const app = getAdminApp();
  const db = app.firestore();

  // 1. Clear incidents
  console.log("Fetching all master incidents...");
  const incidentsSnapshot = await db.collection("incidents").get();
  console.log(`Found ${incidentsSnapshot.size} incidents. Deleting...`);
  
  const incidentDeletes = incidentsSnapshot.docs.map(docSnap => {
    console.log(`Deleting incident: ${docSnap.id} (${docSnap.data().referenceNumber})`);
    return docSnap.ref.delete();
  });
  await Promise.all(incidentDeletes);
  console.log("All incidents deleted successfully!");

  // 2. Clear emergencies
  console.log("\nFetching all emergencies...");
  const emergenciesSnapshot = await db.collection("emergencies").get();
  console.log(`Found ${emergenciesSnapshot.size} emergencies. Deleting...`);

  const emergencyDeletes = emergenciesSnapshot.docs.map(docSnap => {
    console.log(`Deleting emergency report: ${docSnap.id}`);
    return docSnap.ref.delete();
  });
  await Promise.all(emergencyDeletes);
  console.log("All emergencies deleted successfully!");

  console.log("\n✨ Clean slate! All master incidents and civilian reports cleared. All user/dispatcher profiles were kept untouched.");
}

clearDatabase().catch(console.error);
