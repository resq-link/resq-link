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
    const serviceAccount =
      typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  throw new Error('Missing Firebase Admin credentials.');
}

async function main() {
  try {
    const app = getAdminApp();
    const auth = app.auth();
    const user = await auth.getUserByEmail('command@rescue.ph');
    await auth.updateUser(user.uid, { password: 'command123' });
    console.log(`RESET:${user.uid}`);
  } catch (error: any) {
    console.log(`ERROR:${error?.message || String(error)}`);
    process.exitCode = 1;
  }
}

main();
