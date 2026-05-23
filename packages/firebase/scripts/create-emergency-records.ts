/**
 * Seed sample emergency incident records for testing (automatic — no prompts).
 * Same pattern as create-civilian-users.ts.
 *
 * Inserts documents into Firestore `emergencies` for Intake, dashboard, maps, and priority filters.
 *
 * Usage:
 *   npx ts-node scripts/create-emergency-records.ts
 */

import { EventEmitter } from 'events';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

EventEmitter.defaultMaxListeners = 20;

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

const SEED_USER_EMAIL = 'civilian@rescue.ph';
const SEED_USER_ID_FALLBACK = 'seed-emergency-civilian';

type EmergencySeed = {
  incidentType:
    | 'fire'
    | 'medical'
    | 'vehicular_accident'
    | 'police_emergency'
    | 'electrical_powerline_hazard'
    | 'other_emergency';
  locationText: string;
  landmark: string;
  latitude: number;
  longitude: number;
  peopleInvolved: number;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  minutesAgo: number;
};

const emergencies: EmergencySeed[] = [
  {
    incidentType: 'fire',
    locationText: 'Bonifacio St, Tuguegarao City, Cagayan',
    landmark: 'Near Cagayan Provincial Capitol',
    latitude: 17.6138,
    longitude: 121.7269,
    peopleInvolved: 12,
    description: 'Structure fire reported on second floor; smoke visible from street.',
    priority: 'critical',
    minutesAgo: 5,
  },
  {
    incidentType: 'medical',
    locationText: 'Rizal St cor Mabini Blvd, Tuguegarao City, Cagayan',
    landmark: 'Beside Cagayan Valley Medical Center gate',
    latitude: 17.6162,
    longitude: 121.7284,
    peopleInvolved: 1,
    description: 'Unconscious male, possible cardiac arrest; bystander performing CPR.',
    priority: 'critical',
    minutesAgo: 8,
  },
  {
    incidentType: 'vehicular_accident',
    locationText: 'Maharlika Highway, Solana, Cagayan',
    landmark: 'KM 498 marker, northbound lane',
    latitude: 17.6584,
    longitude: 121.6841,
    peopleInvolved: 4,
    description: 'Multi-vehicle collision; two motorcycles and one van, traffic backing up.',
    priority: 'high',
    minutesAgo: 12,
  },
  {
    incidentType: 'police_emergency',
    locationText: 'Luna St, Tuguegarao City, Cagayan',
    landmark: 'In front of Tuguegarao City Hall',
    latitude: 17.6151,
    longitude: 121.7248,
    peopleInvolved: 2,
    description: 'Altercation escalating; caller reports possible weapon involved.',
    priority: 'high',
    minutesAgo: 18,
  },
  {
    incidentType: 'electrical_powerline_hazard',
    locationText: 'Pengue-Ruyu, Tuguegarao City, Cagayan',
    landmark: 'Across from Saint Paul University',
    latitude: 17.6203,
    longitude: 121.7316,
    peopleInvolved: 0,
    description: 'Downed power line after strong wind; sparks on wet pavement.',
    priority: 'high',
    minutesAgo: 22,
  },
  {
    incidentType: 'medical',
    locationText: 'Balzain Road, Tuguegarao City, Cagayan',
    landmark: 'Near Balzain Elementary School',
    latitude: 17.6097,
    longitude: 121.7352,
    peopleInvolved: 1,
    description: 'Elderly woman with high fever and difficulty breathing at home.',
    priority: 'medium',
    minutesAgo: 28,
  },
  {
    incidentType: 'other_emergency',
    locationText: 'Santan, Tuguegarao City, Cagayan',
    landmark: 'Along Pinacanauan River bank',
    latitude: 17.6074,
    longitude: 121.7196,
    peopleInvolved: 3,
    description: 'Flooding knee-deep after heavy rain; residents requesting evacuation assistance.',
    priority: 'medium',
    minutesAgo: 35,
  },
  {
    incidentType: 'other_emergency',
    locationText: 'Centro 10, Tuguegarao City, Cagayan',
    landmark: 'Behind Buntun Bridge approach',
    latitude: 17.6012,
    longitude: 121.7128,
    peopleInvolved: 1,
    description: 'Stray dog bite reported; victim needs rabies referral guidance.',
    priority: 'low',
    minutesAgo: 42,
  },
  {
    incidentType: 'fire',
    locationText: 'Carig Sur, Tuguegarao City, Cagayan',
    landmark: 'Open lot near Carig Norte barangay hall',
    latitude: 17.6259,
    longitude: 121.7387,
    peopleInvolved: 0,
    description: 'Small grass fire spreading slowly; no structures threatened yet.',
    priority: 'low',
    minutesAgo: 50,
  },
  {
    incidentType: 'medical',
    locationText: 'Enrile Blvd, Tuguegarao City, Cagayan',
    landmark: 'Opposite University of Cagayan Valley',
    latitude: 17.6188,
    longitude: 121.7221,
    peopleInvolved: 2,
    description: 'Pregnant woman in active labor; family requesting ambulance transport.',
    priority: 'critical',
    minutesAgo: 3,
  },
];

async function resolveSeedUserId(auth: admin.auth.Auth): Promise<string> {
  try {
    const user = await auth.getUserByEmail(SEED_USER_EMAIL);
    return user.uid;
  } catch {
    return SEED_USER_ID_FALLBACK;
  }
}

async function main() {
  const app = getAdminApp();
  const db = app.firestore();
  const userId = await resolveSeedUserId(app.auth());

  for (const record of emergencies) {
    try {
      const createdAt = admin.firestore.Timestamp.fromMillis(
        Date.now() - record.minutesAgo * 60 * 1000
      );
      const docRef = await db.collection('emergencies').add({
        userId,
        status: 'pending',
        incidentType: record.incidentType,
        locationText: record.locationText,
        landmark: record.landmark,
        latitude: record.latitude,
        longitude: record.longitude,
        peopleInvolved: record.peopleInvolved,
        description: record.description,
        priority: record.priority,
        priorityLevel: record.priority,
        alertAcknowledged: false,
        escalationLevel: 0,
        lastAlertAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      console.log(`CREATED:${docRef.id}`);
    } catch (error: any) {
      console.log(`ERROR:${error?.message || String(error)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
