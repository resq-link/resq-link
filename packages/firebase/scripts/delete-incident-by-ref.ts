/**
 * Delete a single incident (and linked emergencies/dispatches) by reference number.
 * Usage: npx ts-node scripts/delete-incident-by-ref.ts INC-1788087640570
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

async function deleteIncidentByReference(referenceNumber: string): Promise<void> {
  const db = getAdminApp().firestore();
  let incidentDocs: admin.firestore.QueryDocumentSnapshot[] = [];

  const byRef = await db
    .collection('incidents')
    .where('referenceNumber', '==', referenceNumber)
    .get();

  if (!byRef.empty) {
    incidentDocs = byRef.docs;
  } else {
    const direct = await db.collection('incidents').doc(referenceNumber).get();
    if (direct.exists) {
      incidentDocs = [direct as admin.firestore.QueryDocumentSnapshot];
    }
  }

  if (incidentDocs.length === 0) {
    console.log(`No incident found for reference: ${referenceNumber}`);
    process.exit(1);
  }

  for (const docSnap of incidentDocs) {
    const incidentId = docSnap.id;
    const data = docSnap.data();
    console.log(`Found incident: ${incidentId} (${data.referenceNumber ?? referenceNumber})`);

    const emergencies = await db
      .collection('emergencies')
      .where('incidentId', '==', incidentId)
      .get();
    for (const emergencyDoc of emergencies.docs) {
      await emergencyDoc.ref.delete();
      console.log(`  deleted emergency ${emergencyDoc.id}`);
    }

    const dispatches = await db
      .collection('incidentDispatches')
      .where('incidentId', '==', incidentId)
      .get();
    for (const dispatchDoc of dispatches.docs) {
      await dispatchDoc.ref.delete();
    }
    console.log(`  deleted ${dispatches.size} dispatch record(s)`);

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
    if (history.size > 0) {
      console.log(`  deleted ${history.size} team history entry(ies)`);
    }

    await db.collection('incidents').doc(incidentId).delete();
    console.log(`Deleted incident ${incidentId} (${data.referenceNumber ?? referenceNumber})`);
  }

  console.log('Done.');
}

const ref = process.argv[2];
const verifyOnly = process.argv.includes('--verify');

if (!ref) {
  console.error('Usage: npx ts-node scripts/delete-incident-by-ref.ts INC-XXXXXXXX [--verify]');
  process.exit(1);
}

if (verifyOnly) {
  verify(ref).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  deleteIncidentByReference(ref)
    .then(() => verify(ref))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

async function verify(referenceNumber: string): Promise<void> {
  const db = getAdminApp().firestore();
  const byRef = await db.collection('incidents').where('referenceNumber', '==', referenceNumber).get();
  console.log(`Verify incidents with ref ${referenceNumber}: ${byRef.size}`);
  const emergencies = await db.collection('emergencies').get();
  const linked = emergencies.docs.filter((d) => {
    const data = d.data();
    return data.incidentId && (
      byRef.docs.some((i) => i.id === data.incidentId) ||
      String(data.description || '').includes('1788087640570')
    );
  });
  console.log(`Emergencies still linked or matching: ${linked.length}`);
  linked.forEach((d) => console.log(`  ${d.id} status=${d.data().status} incidentId=${d.data().incidentId}`));
}
