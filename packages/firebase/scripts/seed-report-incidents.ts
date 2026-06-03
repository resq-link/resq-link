/**
 * Seed completed incidents and resolved emergencies for report/export QA.
 * All records include teamOnDuty, agency, resolvedAt, and response metrics.
 *
 * Usage:
 *   npx ts-node scripts/seed-report-incidents.ts
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
    const serviceAccount =
      typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp();
  }

  throw new Error('Missing Firebase Admin credentials in packages/firebase/.env');
}

const TEAMS = ['Whiskey', 'X-ray', 'Yankee', 'Zulu'] as const;
const SEED_CC_EMAIL = 'civilian@rescue.ph';
const SEED_CC_FALLBACK = 'seed-report-command-center';

type ResolvedIncidentSeed = {
  referenceNumber: string;
  teamOnDuty: (typeof TEAMS)[number];
  incidentSubtypeId: string;
  incidentSubtypeLabel: string;
  incidentCategory: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignedAgencies: string[];
  locationText: string;
  minutesAgo: number;
  responseTimeSeconds: number;
  resolutionMinutes: number;
};

const resolvedIncidents: ResolvedIncidentSeed[] = [
  {
    referenceNumber: 'INC-SEED-001',
    teamOnDuty: 'Whiskey',
    incidentSubtypeId: 'fire-residential',
    incidentSubtypeLabel: 'Fire (Residential)',
    incidentCategory: 'fire',
    priority: 'critical',
    assignedAgencies: ['BFP', 'RESCUE_1111'],
    locationText: 'Bonifacio St, Tuguegarao City, Cagayan',
    minutesAgo: 240,
    responseTimeSeconds: 420,
    resolutionMinutes: 95,
  },
  {
    referenceNumber: 'INC-SEED-002',
    teamOnDuty: 'X-ray',
    incidentSubtypeId: 'medical-emergency',
    incidentSubtypeLabel: 'Medical Emergency',
    incidentCategory: 'medical',
    priority: 'critical',
    assignedAgencies: ['TCPGH', 'RESCUE_1111'],
    locationText: 'Rizal St, Tuguegarao City, Cagayan',
    minutesAgo: 180,
    responseTimeSeconds: 300,
    resolutionMinutes: 70,
  },
  {
    referenceNumber: 'INC-SEED-003',
    teamOnDuty: 'Yankee',
    incidentSubtypeId: 'vehicular-collision',
    incidentSubtypeLabel: 'Vehicular Collision',
    incidentCategory: 'vehicular',
    priority: 'high',
    assignedAgencies: ['PNP', 'TFLC', 'TCPGH'],
    locationText: 'Maharlika Highway, Solana, Cagayan',
    minutesAgo: 120,
    responseTimeSeconds: 540,
    resolutionMinutes: 110,
  },
  {
    referenceNumber: 'INC-SEED-004',
    teamOnDuty: 'Zulu',
    incidentSubtypeId: 'police-emergency',
    incidentSubtypeLabel: 'Police Emergency',
    incidentCategory: 'peace_and_order',
    priority: 'high',
    assignedAgencies: ['PNP'],
    locationText: 'Luna St, Tuguegarao City, Cagayan',
    minutesAgo: 90,
    responseTimeSeconds: 360,
    resolutionMinutes: 80,
  },
];

async function resolveCommandCenterId(auth: admin.auth.Auth): Promise<string> {
  try {
    const user = await auth.getUserByEmail(SEED_CC_EMAIL);
    return user.uid;
  } catch {
    return SEED_CC_FALLBACK;
  }
}

async function seedResolvedIncidents(db: admin.firestore.Firestore, adminId: string) {
  for (const record of resolvedIncidents) {
    const now = Date.now();
    const createdAt = admin.firestore.Timestamp.fromMillis(now - record.minutesAgo * 60 * 1000);
    const resolvedAt = admin.firestore.Timestamp.fromMillis(
      createdAt.toMillis() + record.resolutionMinutes * 60 * 1000
    );
    const acceptedAt = admin.firestore.Timestamp.fromMillis(
      createdAt.toMillis() + record.responseTimeSeconds * 1000
    );

    const docRef = await db.collection('incidents').add({
      referenceNumber: record.referenceNumber,
      associatedReportIds: [],
      source: 'call',
      createdByUserId: adminId,
      commandCenterAdminId: adminId,
      incidentCategory: record.incidentCategory,
      incidentSubtypeId: record.incidentSubtypeId,
      incidentSubtypeLabel: record.incidentSubtypeLabel,
      priority: record.priority,
      locationText: record.locationText,
      landmark: null,
      quadrant: 'NW',
      latitude: 17.6138,
      longitude: 121.7269,
      callerName: 'Seed Caller',
      callerContact: '09170000000',
      description: 'Seeded resolved incident for reporting QA.',
      requiresExternalAgency: false,
      recommendedAgencies: record.assignedAgencies,
      assignedAgencies: record.assignedAgencies,
      assignedResourceIds: [],
      teamId: null,
      teamName: record.teamOnDuty,
      teamOnDuty: record.teamOnDuty,
      incidentDate: '2026-06-01',
      incidentTime: '10:00 AM',
      dateOfDuty: '2026-06-01',
      scheduleOfDuty: 'AM',
      status: 'resolved',
      resolutionStatus: 'resolved',
      responseTimeSeconds: record.responseTimeSeconds,
      acceptedAt,
      resolvedAt,
      createdAt,
      updatedAt: resolvedAt,
    });

    console.log(`INCIDENT_CREATED:${docRef.id}:${record.referenceNumber}`);
  }
}

async function seedResolvedEmergencies(db: admin.firestore.Firestore, userId: string) {
  const seeds = [
    {
      incidentType: 'fire',
      team: 'Whiskey',
      assignedAgency: 'BFP',
      locationText: 'Carig Sur, Tuguegarao City, Cagayan',
      priority: 'critical' as const,
      minutesAgo: 300,
      responseTimeSeconds: 480,
    },
    {
      incidentType: 'medical',
      team: 'X-ray',
      assignedAgency: 'AMBULANCE',
      locationText: 'Enrile Blvd, Tuguegarao City, Cagayan',
      priority: 'high' as const,
      minutesAgo: 200,
      responseTimeSeconds: 240,
    },
  ];

  for (const record of seeds) {
    const createdAt = admin.firestore.Timestamp.fromMillis(Date.now() - record.minutesAgo * 60 * 1000);
    const resolvedAt = admin.firestore.Timestamp.fromMillis(createdAt.toMillis() + 90 * 60 * 1000);

    const docRef = await db.collection('emergencies').add({
      userId,
      status: 'done',
      incidentType: record.incidentType,
      locationText: record.locationText,
      landmark: 'Report seed',
      latitude: 17.615,
      longitude: 121.725,
      peopleInvolved: 1,
      description: 'Seeded resolved emergency for reporting QA.',
      priority: record.priority,
      priorityLevel: record.priority,
      assignedAgency: record.assignedAgency,
      suggestedAgency: record.assignedAgency,
      responder: record.team,
      assignedResponderId: null,
      responseTimeSeconds: record.responseTimeSeconds,
      acceptedAt: admin.firestore.Timestamp.fromMillis(
        createdAt.toMillis() + record.responseTimeSeconds * 1000
      ),
      movedToHistoryAt: resolvedAt,
      alertAcknowledged: true,
      escalationLevel: 0,
      lastAlertAt: createdAt,
      createdAt,
      updatedAt: resolvedAt,
    });

    console.log(`EMERGENCY_CREATED:${docRef.id}`);
  }
}

async function main() {
  const app = getAdminApp();
  const db = app.firestore();
  const adminId = await resolveCommandCenterId(app.auth());
  const userId = adminId;

  await seedResolvedIncidents(db, adminId);
  await seedResolvedEmergencies(db, userId);
  console.log('Report seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
