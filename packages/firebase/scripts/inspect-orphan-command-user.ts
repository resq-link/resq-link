import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

import { getAdminAuth, getAdminFirestore } from '../src/admin';

async function main() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const orphanUid = 'V9OfxozaH0XoY4EJxhVmvKUjHAz2';
  const snap = await db.doc(`users/${orphanUid}`).get();
  console.log('ORPHAN_DOC', JSON.stringify(snap.data()));
  try {
    const user = await auth.getUser(orphanUid);
    console.log(
      'ORPHAN_AUTH',
      JSON.stringify({
        email: user.email,
        disabled: user.disabled,
        claims: user.customClaims || null,
      })
    );
  } catch (error: unknown) {
    console.log('ORPHAN_AUTH_MISSING', error instanceof Error ? error.message : String(error));
  }

  // Sample a few users without civilian role
  const all = await db.collection('users').select('email', 'role', 'name').limit(50).get();
  const nonCivilian = all.docs.filter((d) => {
    const role = String(d.data()?.role || '').toLowerCase();
    return role !== 'civilian';
  });
  console.log(
    'NON_CIVILIAN_USERS',
    nonCivilian.length,
    nonCivilian.map((d) => `${d.id}:${d.data()?.email}:${d.data()?.role}`)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
