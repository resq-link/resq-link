/**
 * Validates incident lifecycle predicates (no Firebase connection required).
 *
 * Usage: npx ts-node scripts/validate-incident-lifecycle.ts
 */

import {
  isLiveIncident,
  isLiveEmergencyReport,
  isResolvedIncidentRecord,
  isResolvedEmergencyReport,
  isReportEligibleIncident,
} from '../src/incidentLifecycle';
import type { IncidentRecord } from '../src/incidents';
import type { EmergencyReport } from '../src/emergencies';

type TestResult = { name: string; pass: boolean; detail?: string };

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  results.push({ name, pass: condition, detail });
}

const activeIncident = {
  status: 'dispatched',
  resolutionStatus: 'open',
} as Pick<IncidentRecord, 'status' | 'resolutionStatus'>;

const resolvedIncident = {
  status: 'resolved',
  resolutionStatus: 'resolved',
} as Pick<IncidentRecord, 'status' | 'resolutionStatus'>;

const statusOnlyResolved = {
  status: 'resolved',
  resolutionStatus: 'open',
} as Pick<IncidentRecord, 'status' | 'resolutionStatus'>;

const resolutionOnlyResolved = {
  status: 'on_scene',
  resolutionStatus: 'resolved',
} as Pick<IncidentRecord, 'status' | 'resolutionStatus'>;

const cancelledIncident = {
  status: 'cancelled',
  resolutionStatus: 'resolved',
} as unknown as Pick<IncidentRecord, 'status' | 'resolutionStatus'>;

const activeEmergency = { status: 'on_scene' } as Pick<EmergencyReport, 'status'>;
const resolvedEmergency = { status: 'resolved' } as Pick<EmergencyReport, 'status'>;
const doneEmergency = { status: 'done' } as Pick<EmergencyReport, 'status'>;

// TEST 1 — Active incident in live views, not in reports
assert('TEST 1a: active incident is live', isLiveIncident(activeIncident));
assert('TEST 1b: active incident not report-eligible', !isReportEligibleIncident(activeIncident));

// TEST 2 — Resolved incident fields
assert('TEST 2: fully resolved incident is resolved', isResolvedIncidentRecord(resolvedIncident));

// TEST 3 — Removal from live views
assert('TEST 3a: resolved status not live', !isLiveIncident(resolvedIncident));
assert('TEST 3b: resolution-only resolved not live', !isLiveIncident(resolutionOnlyResolved));
assert('TEST 3c: status-only resolved not live', !isLiveIncident(statusOnlyResolved));

// TEST 4 — Reports eligibility
assert('TEST 4a: resolved in reports', isReportEligibleIncident(resolvedIncident));
assert('TEST 4b: active not in reports', !isReportEligibleIncident(activeIncident));
assert('TEST 4c: cancelled excluded from reports', !isReportEligibleIncident(cancelledIncident));

// TEST 5 — No duplication semantics (live vs report disjoint)
assert(
  'TEST 5: live and report-eligible are mutually exclusive for resolved',
  !isLiveIncident(resolvedIncident) && isReportEligibleIncident(resolvedIncident)
);

// TEST 6 — Emergency report filters
assert('TEST 6a: on_scene emergency is live', isLiveEmergencyReport(activeEmergency));
assert('TEST 6b: resolved emergency not live', !isLiveEmergencyReport(resolvedEmergency));
assert('TEST 6c: done emergency not live', !isLiveEmergencyReport(doneEmergency));
assert('TEST 6d: resolved emergency in report pool', isResolvedEmergencyReport(resolvedEmergency));

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  const icon = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}

console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
