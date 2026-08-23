import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../apps/resq-link-web-app/.env.local') });
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
  
  console.log('=== INSPECTING USERS COLLECTION FOR PUSH TOKENS ===');
  const usersSnap = await db.collection('users').get();
  console.log(`Total users found: ${usersSnap.size}`);
  
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`User [${d.id}]: role=${data.role || 'N/A'}, email=${data.email || 'N/A'}, pushTokens=`, JSON.stringify(data.pushTokens || null));
  });

  console.log('\n=== INSPECTING DISPATCHERS COLLECTION FOR PUSH TOKENS ===');
  const dispatchersSnap = await db.collection('dispatchers').get();
  console.log(`Total dispatchers found: ${dispatchersSnap.size}`);
  dispatchersSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.pushTokens) {
      console.log(`Dispatcher [${d.id}]: role=${data.role || 'N/A'}, email=${data.email || 'N/A'}, pushTokens=`, JSON.stringify(data.pushTokens || null));
    }
  });
}

run().catch(console.error);
