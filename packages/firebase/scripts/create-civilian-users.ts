/**
 * Seed civilian mobile app accounts (automatic — no prompts).
 * Same pattern as create-standard-dispatchers-admin.ts.
 *
 * Creates Firebase Auth (email/password) + Firestore users/{uid} for app login.
 *
 * Usage:
 *   npx ts-node scripts/create-civilian-users.ts
 */

import { EventEmitter } from 'events';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

EventEmitter.defaultMaxListeners = 20;

dotenv.config({ path: resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import { createCivilianAccountAdmin } from '../src/admin';

const civilians = [
  {
    email: 'civilian@rescue.ph',
    password: 'Civilian2024!',
    fullName: 'Test Civilian',
    phone: '+639171234567',
    address: 'Tuguegarao City, Cagayan',
  },
  {
    email: 'maria.santos@rescue.ph',
    password: 'Civilian2024!',
    fullName: 'Maria Santos',
    phone: '+639181234567',
    address: '123 Rizal St, Tuguegarao City',
  },
  {
    email: 'juan.delacruz@rescue.ph',
    password: 'Civilian2024!',
    fullName: 'Juan Dela Cruz',
    phone: '+639191234567',
    address: '456 Mabini St, Tuguegarao City',
  },
] as const;

async function main() {
  for (const civilian of civilians) {
    try {
      const result = await createCivilianAccountAdmin({
        email: civilian.email,
        password: civilian.password,
        fullName: civilian.fullName,
        phone: civilian.phone,
        address: civilian.address,
      });
      console.log(`CREATED:${civilian.email}:${result.uid}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      if (message.includes('email-already-exists') || message.includes('already in use')) {
        try {
          const existing = await admin.auth().getUserByEmail(civilian.email);
          await admin.auth().updateUser(existing.uid, {
            password: civilian.password,
            displayName: civilian.fullName,
          });
          await admin.firestore().doc(`users/${existing.uid}`).set(
            {
              email: civilian.email,
              name: civilian.fullName,
              fullName: civilian.fullName,
              phone: civilian.phone,
              address: civilian.address,
              role: 'civilian',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          console.log(`UPDATED:${civilian.email}:${existing.uid}`);
        } catch (updateError: any) {
          console.log(`ERROR:${civilian.email}:${updateError?.message || String(updateError)}`);
        }
      } else {
        console.log(`ERROR:${civilian.email}:${message}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
