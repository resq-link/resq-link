import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env') });
import * as admin from 'firebase-admin';

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0] as admin.app.App;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
      ? JSON.parse(serviceAccountJson)
      : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return admin.initializeApp();
  throw new Error('Missing credentials');
}

async function run() {
  const app = getAdminApp();
  const db = app.firestore();
  
  console.log("=== PATCHING EMERGENCIES ===");
  const eSnap = await db.collection("emergencies").get();
  const updates = [];
  eSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.assignedResponderId && !data.dispatcherId) {
      console.log('Patching', doc.id, 'with dispatcherId:', data.assignedResponderId);
      updates.push(doc.ref.update({ dispatcherId: data.assignedResponderId }));
    }
  });
  await Promise.all(updates);
  console.log('Done!');
}
run().catch(console.error);
