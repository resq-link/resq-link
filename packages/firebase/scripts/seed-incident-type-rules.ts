import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import { defaultIncidentTypeRules } from '../src/incidentTypeRuleSeeds';

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

async function seedIncidentTypeRules() {
  const app = getAdminApp();
  const firestore = app.firestore();
  const mode = process.env.SEED_MODE === 'overwrite' ? 'overwrite' : 'merge';
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const batch = firestore.batch();
  let skipped = 0;

  for (const rule of defaultIncidentTypeRules) {
    const ref = firestore.doc(`incidentTypeRules/${rule.id}`);
    if (mode === 'merge') {
      const snapshot = await ref.get();
      if (snapshot.exists) {
        skipped += 1;
        continue;
      }
    }

    batch.set(
      ref,
      {
        ...rule,
        updatedAt: timestamp,
      },
      { merge: mode === 'overwrite' }
    );
  }

  await batch.commit();

  console.log(`Seeded ${defaultIncidentTypeRules.length - skipped} incident type rules.`);
  if (mode === 'merge' && skipped > 0) {
    console.log(`Skipped ${skipped} existing rules.`);
  }
}

seedIncidentTypeRules().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
