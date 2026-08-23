/**
 * Quarantine non-civilian docs from `users` and repair command@rescue.ph claims.
 *
 * - Soft-deletes Firestore `users` profiles that are not role=civilian
 *   (e.g. orphan command@rescue.ph profile that appeared under Civilians)
 * - Does NOT delete Firebase Auth users or commandCenters / dispatchers docs
 * - Sets Auth custom claims on command@rescue.ph to role=command_center
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../apps/resq-link-web-app/.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore, setAccountRoleClaims, writeAuditLog } from '../src/admin';

async function main() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  const usersSnap = await db.collection('users').get();
  let quarantined = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data() || {};
    if (data.deleted === true) continue;
    const role = String(data.role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (role === 'civilian') continue;

    await doc.ref.set(
      {
        deleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: 'system',
        deletedReason: 'Quarantined non-civilian users profile during role separation migration',
        disabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await writeAuditLog({
      actorUid: 'system',
      actorEmail: 'system@resq-link.local',
      action: 'account.role_updated',
      targetUid: doc.id,
      targetLabel: typeof data.email === 'string' ? data.email : doc.id,
      targetCollection: 'users',
      metadata: {
        previousRole: data.role || null,
        newRole: 'quarantined_non_civilian',
        email: data.email || null,
      },
    });

    console.log(`QUARANTINED:${doc.id}:${data.email || ''}:role=${data.role || 'missing'}`);
    quarantined += 1;
  }

  try {
    const commandUser = await auth.getUserByEmail('command@rescue.ph');
    await setAccountRoleClaims(commandUser.uid, { role: 'command_center' });
    console.log(`CLAIMS_SET:command@rescue.ph:${commandUser.uid}:command_center`);
  } catch (error: unknown) {
    console.log(
      `CLAIMS_ERROR:command@rescue.ph:${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log(`DONE quarantined=${quarantined}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
