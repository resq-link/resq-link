/**
 * Delete emergency report(s) and linked incident by civilian "APP-XXXXXX" display id.
 * Usage: npx ts-node scripts/delete-by-app-id.ts 8706G
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });

import * as admin from 'firebase-admin';

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

  const serviceAccountPath = resolve(__dirname, '../service-account.json');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const serviceAccount = require(serviceAccountPath);
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function deleteIncidentRecord(
  db: admin.firestore.Firestore,
  incidentId: string,
  referenceNumber?: string,
): Promise<void> {
  const dispatches = await db
    .collection('incidentDispatches')
    .where('incidentId', '==', incidentId)
    .get();
  for (const dispatchDoc of dispatches.docs) {
    await dispatchDoc.ref.delete();
  }

  const resources = await db
    .collection('resources')
    .where('assignedIncidentId', '==', incidentId)
    .get();
  for (const resourceDoc of resources.docs) {
    await resourceDoc.ref.update({
      status: 'available',
      assignedIncidentId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  released resource ${resourceDoc.id}`);
  }

  const history = await db
    .collection('incidents')
    .doc(incidentId)
    .collection('teamAssignmentHistory')
    .get();
  for (const historyDoc of history.docs) {
    await historyDoc.ref.delete();
  }

  await db.collection('incidents').doc(incidentId).delete();
  console.log(`Deleted incident ${incidentId}${referenceNumber ? ` (${referenceNumber})` : ''}`);
}

async function main(): Promise<void> {
  const raw = (process.argv[2] || '').trim().toUpperCase().replace(/^APP[-\s]*/i, '');
  if (!raw) {
    console.error('Usage: npx ts-node scripts/delete-by-app-id.ts 8706G');
    process.exit(1);
  }

  const db = getAdminApp().firestore();
  const snapshot = await db.collection('emergencies').get();
  const matches = snapshot.docs.filter((docSnap) =>
    docSnap.id.slice(-6).toUpperCase() === raw || docSnap.id.toUpperCase().endsWith(raw),
  );

  if (matches.length === 0) {
    console.log(`No emergency report found ending with: ${raw} (APP-${raw})`);
    process.exit(1);
  }

  const incidentIds = new Set<string>();

  for (const emergencyDoc of matches) {
    const data = emergencyDoc.data();
    console.log(`Found emergency ${emergencyDoc.id} (APP-${emergencyDoc.id.slice(-6).toUpperCase()})`);
    console.log(`  status=${data.status} incidentId=${data.incidentId ?? 'none'}`);

    if (data.incidentId) {
      incidentIds.add(String(data.incidentId));
    }

    await emergencyDoc.ref.delete();
    console.log(`  deleted emergency ${emergencyDoc.id}`);
  }

  for (const incidentId of incidentIds) {
    const incidentSnap = await db.collection('incidents').doc(incidentId).get();
    if (!incidentSnap.exists) {
      console.log(`Linked incident ${incidentId} already absent`);
      continue;
    }
    const refNum = incidentSnap.data()?.referenceNumber as string | undefined;
    console.log(`Deleting linked incident ${incidentId} (${refNum ?? 'no ref'})`);

    const linkedEmergencies = await db
      .collection('emergencies')
      .where('incidentId', '==', incidentId)
      .get();
    for (const e of linkedEmergencies.docs) {
      await e.ref.delete();
      console.log(`  deleted linked emergency ${e.id}`);
    }

    await deleteIncidentRecord(db, incidentId, refNum);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
