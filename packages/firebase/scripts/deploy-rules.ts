import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

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

async function deployRules() {
  console.log("Initializing Firebase Admin SDK...");
  const app = getAdminApp();
  const rulesPath = resolve(__dirname, '../firestore.rules');
  
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules file not found at: ${rulesPath}`);
  }
  
  console.log(`Reading rules from: ${rulesPath}`);
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  
  console.log("Deploying rules via releaseFirestoreRulesetFromSource...");
  const securityRules = app.securityRules();
  await securityRules.releaseFirestoreRulesetFromSource(rulesContent);
  
  console.log("✨ Security rules successfully deployed via Admin SDK!");
}

deployRules().catch(error => {
  console.error("❌ Failed to deploy security rules:", error);
  process.exit(1);
});
