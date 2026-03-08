/**
 * Script to create the first super admin account
 *
 * Usage:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON in packages/firebase/.env
 * 2. Run: npx ts-node scripts/create-first-admin.ts
 *
 * Or with inline env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' npx ts-node scripts/create-first-admin.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@rescue.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdmin2024!';

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
    } catch (e) {
      throw new Error(
        'Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Must be valid JSON or base64-encoded JSON.'
      );
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  throw new Error(
    'Missing Firebase Admin credentials. Create packages/firebase/.env with either:\n' +
    '  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}\n' +
    '  OR\n' +
    '  GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json\n\n' +
    'Get the key from Firebase Console → Project Settings → Service Accounts → Generate new private key'
  );
}

async function createFirstAdmin() {
  console.log('🚀 Creating first super admin account...\n');

  const app = getAdminApp();
  const auth = app.auth();
  const firestore = app.firestore();

  try {
    const userRecord = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Super Admin',
    });

    await firestore.doc(`admins/${userRecord.uid}`).set({
      email: ADMIN_EMAIL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'super_admin',
    });

    console.log('✅ Success! Super admin account created:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   User ID: ${userRecord.uid}`);
    console.log('\n⚠️  Change the password after first login.');
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️  Account already exists: ${ADMIN_EMAIL}`);
      const user = await auth.getUserByEmail(ADMIN_EMAIL);
      const adminDoc = await firestore.doc(`admins/${user.uid}`).get();
      if (!adminDoc.exists) {
        await firestore.doc(`admins/${user.uid}`).set({
          email: ADMIN_EMAIL,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          role: 'super_admin',
        });
        console.log('   Added existing user to admins collection.');
      }
    } else {
      throw error;
    }
  }

  console.log('\n✨ Done!');
}

createFirstAdmin().catch(console.error);
