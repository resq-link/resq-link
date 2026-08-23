import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

import { getAdminAuth, getAdminFirestore } from '../src/admin';

async function main() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const email = 'command@rescue.ph';
  const user = await auth.getUserByEmail(email);
  console.log(
    'AUTH',
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      claims: user.customClaims || null,
      disabled: user.disabled,
    })
  );
  for (const col of ['users', 'dispatchers', 'commandCenters', 'admins'] as const) {
    const snap = await db.doc(`${col}/${user.uid}`).get();
    console.log(`${col}:`, snap.exists ? JSON.stringify(snap.data()) : 'MISSING');
  }
  const byEmail = await db.collection('users').where('email', '==', email).limit(5).get();
  console.log(
    'users_by_email:',
    byEmail.size,
    byEmail.docs.map((d) => `${d.id}:${JSON.stringify(d.data()?.role)}`)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
