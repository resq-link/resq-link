/**
 * Backfill assignedTeam* fields on legacy incidents from teamOnDuty / teamName.
 *
 * Usage:
 *   npx ts-node scripts/migrate-assigned-teams.ts [--dry-run]
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_TEAMS = [
  { code: 'whiskey', label: 'Whiskey' },
  { code: 'x-ray', label: 'X-ray' },
  { code: 'yankee', label: 'Yankee' },
  { code: 'zulu', label: 'Zulu' },
];

const dryRun = process.argv.includes('--dry-run');

function initAdmin() {
  if (getApps().length > 0) return getFirestore();

  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Missing service-account.json at ${serviceAccountPath}. Place Firebase admin credentials there.`
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

async function ensureTeams(db: FirebaseFirestore.Firestore) {
  const teamsRef = db.collection('teams');
  const existing = await teamsRef.get();
  const byLabel = new Map<string, FirebaseFirestore.DocumentSnapshot>();

  existing.docs.forEach((docSnap) => {
    const label = String(docSnap.data().label || '').toLowerCase();
    if (label) byLabel.set(label, docSnap);
  });

  const teamIdByLabel = new Map<string, string>();

  for (const template of DEFAULT_TEAMS) {
    const found = byLabel.get(template.label.toLowerCase());
    if (found) {
      teamIdByLabel.set(template.label.toLowerCase(), found.id);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Would create team: ${template.label}`);
      teamIdByLabel.set(template.label.toLowerCase(), `dry-run-${template.code}`);
      continue;
    }

    const created = await teamsRef.add({
      code: template.code,
      label: template.label,
      description: `Operational duty team ${template.label}`,
      isActive: true,
      sortOrder: DEFAULT_TEAMS.indexOf(template) + 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    teamIdByLabel.set(template.label.toLowerCase(), created.id);
    console.log(`Created team ${template.label} (${created.id})`);
  }

  return teamIdByLabel;
}

function resolveLegacyTeam(
  data: FirebaseFirestore.DocumentData,
  teamIdByLabel: Map<string, string>
) {
  if (data.assignedTeamId && data.assignedTeamName && data.assignedTeamCode) {
    return null;
  }

  const candidate =
    data.teamOnDuty || data.assignedTeamName || data.teamName || data.assignedTeamCode;
  if (!candidate || typeof candidate !== 'string') return null;

  const normalized = candidate.trim().toLowerCase();
  const template =
    DEFAULT_TEAMS.find(
      (team) => team.label.toLowerCase() === normalized || team.code === normalized
    ) ?? null;

  if (!template) return null;

  const teamId = teamIdByLabel.get(template.label.toLowerCase()) || null;
  if (!teamId) return null;

  return {
    assignedTeamId: teamId,
    assignedTeamName: template.label,
    assignedTeamCode: template.code,
    assignedTeamAt: data.assignedTeamAt || data.createdAt || Timestamp.now(),
    assignedTeamBy: data.assignedTeamBy || data.createdByUserId || 'migration',
    teamId,
    teamName: template.label,
    teamOnDuty: template.label,
  };
}

async function main() {
  const db = initAdmin();
  console.log(dryRun ? 'Running in DRY-RUN mode' : 'Running migration');

  const teamIdByLabel = await ensureTeams(db);
  const incidentsSnap = await db.collection('incidents').get();

  let updated = 0;
  let skipped = 0;
  let unassigned = 0;

  for (const docSnap of incidentsSnap.docs) {
    const patch = resolveLegacyTeam(docSnap.data(), teamIdByLabel);
    if (!patch) {
      if (!docSnap.data().assignedTeamId) unassigned += 1;
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Would update incident ${docSnap.id}:`, patch);
    } else {
      await docSnap.ref.update({
        ...patch,
        updatedAt: Timestamp.now(),
      });
    }
    updated += 1;
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Still unassigned: ${unassigned}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
