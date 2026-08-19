/**
 * Validates assigned-team reporting logic without Firebase.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/validate-assigned-team-logic.ts
 */
import type { IncidentRecord } from '@packages/firebase'
import { incidentMatchesTeamFilter } from '@packages/firebase'
import { filterIncidents } from '../lib/reporting/incidents'
import { computeTeamSummaryCards } from '../lib/reporting/analytics'
import { getDefaultReportFilters } from '../lib/reporting/filters'

const teams = [
  { code: 'whiskey', label: 'Whiskey' },
  { code: 'x-ray', label: 'X-ray' },
  { code: 'yankee', label: 'Yankee' },
  { code: 'zulu', label: 'Zulu' },
]

function makeIncident(teamCode: string, teamLabel: string, id: string): IncidentRecord {
  return {
    referenceNumber: id,
    source: 'manual',
    createdByUserId: 'dispatcher-1',
    commandCenterAdminId: 'dispatcher-1',
    incidentCategory: 'fire',
    incidentSubtypeId: 'fire-structure',
    incidentSubtypeLabel: 'Structure Fire',
    priority: 'high',
    locationText: 'Test Location',
    requiresExternalAgency: false,
    recommendedAgencies: [],
    assignedAgencies: [],
    assignedResourceIds: [],
    assignedTeamId: `team-${teamCode}`,
    assignedTeamName: teamLabel,
    assignedTeamCode: teamCode,
    teamOnDuty: teamLabel,
    teamName: teamLabel,
    status: 'resolved',
    resolutionStatus: 'resolved',
    incidentDate: '2026-07-01',
    incidentTime: '10:00 AM',
    createdAt: new Date('2026-07-01T02:00:00Z'),
    resolvedAt: new Date('2026-07-01T03:00:00Z'),
    responseTimeSeconds: 3600,
  }
}

const incidents = teams.map((team) => makeIncident(team.code, team.label, `INC-${team.code}`))

let passed = 0
let failed = 0

function assert(name: string, condition: boolean) {
  if (condition) {
    passed += 1
    console.log(`PASS: ${name}`)
  } else {
    failed += 1
    console.error(`FAIL: ${name}`)
  }
}

for (const team of teams) {
  const match = incidents.filter((incident) => incidentMatchesTeamFilter(incident, team.code))
  assert(`Filter ${team.label}`, match.length === 1 && match[0].assignedTeamCode === team.code)
}

const filters = { ...getDefaultReportFilters(), fromDate: '2026-07-01', toDate: '2026-07-31' }
for (const team of teams) {
  const filtered = filterIncidents(incidents, { ...filters, selectedTeam: team.code }, { reportEligibleOnly: true })
  assert(`Report filter ${team.label}`, filtered.length === 1)
}

const summary = computeTeamSummaryCards(incidents, filters, teams)
assert('Team summary card count', summary.length === 4)
for (const team of teams) {
  const card = summary.find((entry) => entry.team === team.code)
  assert(`Summary ${team.label} completed`, card?.completed === 1)
}

console.log(`\nValidation complete: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
