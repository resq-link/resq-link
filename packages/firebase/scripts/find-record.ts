import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env') });
import * as admin from 'firebase-admin';
const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON!;
const sa = json.startsWith('{') ? JSON.parse(json) : JSON.parse(Buffer.from(json, 'base64').toString());
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const needle = (process.argv[2] || '8706').toLowerCase();

async function main() {
  const em = await db.collection('emergencies').get();
  console.log('Total emergencies:', em.size);
  const recent = em.docs
    .map((d) => ({ id: d.id, app: `APP-${d.id.slice(-6).toUpperCase()}`, data: d.data() }))
    .sort((a, b) => {
      const at = a.data.createdAt?.toMillis?.() ?? 0;
      const bt = b.data.createdAt?.toMillis?.() ?? 0;
      return bt - at;
    })
    .slice(0, 15);
  recent.forEach((r) => console.log(`  ${r.app} id=${r.id} status=${r.data.status} incidentId=${r.data.incidentId}`));

  const needle = (process.argv[2] || '').toLowerCase();
  if (!needle) return;

  const emMatches = em.docs.filter((d) => d.id.toLowerCase().includes(needle));
  console.log('Emergencies matching', needle, ':', emMatches.length);
  emMatches.forEach((d) => {
    const data = d.data();
    console.log(`  ${d.id} APP-${d.id.slice(-6).toUpperCase()} status=${data.status} incidentId=${data.incidentId}`);
  });

  const inc = await db.collection('incidents').get();
  const incMatches = inc.docs.filter((d) => {
    const data = d.data();
    return d.id.toLowerCase().includes(needle) || String(data.referenceNumber || '').toLowerCase().includes(needle);
  });
  console.log('Incidents matching', needle, ':', incMatches.length);
  incMatches.forEach((d) => {
    const data = d.data();
    console.log(`  ${d.id} ref=${data.referenceNumber} status=${data.status}`);
  });
}
main();
