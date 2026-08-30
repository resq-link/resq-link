import {
  sortTeamsByOrder,
  type TeamRecord,
} from '@packages/firebase'

/** Stable unique list for selects, filters, and report cards. */
export function normalizeOperationalTeams(teams: TeamRecord[]): TeamRecord[] {
  return sortTeamsByOrder(teams.filter((team) => team.isActive !== false))
}

/** React list key — never use bare team.code (duplicates share the same code). */
export function teamReactKey(team: TeamRecord, index: number): string {
  const code = (team.code || team.label || 'team').trim().toLowerCase()
  const id = team.id?.trim()
  return id ? `${id}::${code}` : `${code}::${index}`
}

export type TeamOption = { code: string; label: string; id?: string }

export function buildTeamOptions(teams: TeamRecord[]): TeamOption[] {
  return normalizeOperationalTeams(teams).map((team) => ({
    id: team.id,
    code: team.code,
    label: team.label,
  }))
}

export function teamOptionKey(option: TeamOption, index: number): string {
  const code = option.code.trim().toLowerCase()
  const id = option.id?.trim()
  return id ? `${id}::${code}` : `${code}::${index}`
}

/** Dedupe `{ code, label }` rows used by reporting helpers. */
export function dedupeTeamOptions<T extends { code: string }>(options: T[]): T[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    const code = option.code.trim().toLowerCase()
    if (!code || seen.has(code)) return false
    seen.add(code)
    return true
  })
}

/** Merge Firestore teams with responder-derived codes without duplicate keys. */
export function mergeTeamOptions(
  teams: TeamRecord[],
  responderTeams: TeamRecord[]
): TeamRecord[] {
  const merged = new Map<string, TeamRecord>()

  normalizeOperationalTeams(teams).forEach((team) => {
    const code = (team.code || team.label).trim().toLowerCase()
    if (!code) return
    merged.set(code, team)
  })

  responderTeams.forEach((team) => {
    const code = (team.code || team.label).trim().toLowerCase()
    if (!code || merged.has(code)) return
    merged.set(code, team)
  })

  return sortTeamsByOrder(Array.from(merged.values()))
}
