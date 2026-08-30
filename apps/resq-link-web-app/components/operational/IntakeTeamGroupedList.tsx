'use client'

import { useMemo } from 'react'
import {
  getAssignedTeamName,
  type IncidentRecord,
  type TeamRecord,
  comparePriority,
  normalizePriority,
} from '@packages/firebase'
import IntakeListItem, { type IntakeQueueItem } from '@/components/IntakeListItem'
import { getTeamCardTheme } from '@/lib/reporting/teamSummaryTheme'
import { teamReactKey } from '@/lib/operational/teamUtils'

const INCOMING_KEY = '__incoming__'

const normalizeTeamCode = (value: string): string => value.trim().toLowerCase()

const TEAM_SECTION_EMOJI: Record<string, string> = {
  Whiskey: '🟠',
  'X-ray': '🔵',
  Yankee: '🟢',
  Zulu: '🟣',
}

type IntakeTeamGroupedListProps = {
  items: IntakeQueueItem[]
  teams: TeamRecord[]
  recentIncidents: IncidentRecord[]
  selectedItemId?: string | null
  /** When set, takes precedence over selectedItemId for highlight matching. */
  selectedItemKey?: string | null
  duplicateCounts: Record<string, number>
  onSelect: (item: IntakeQueueItem) => void
  /** Show every operational team section, including teams with zero active incidents. */
  showEmptyTeams?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

function itemKey(item: IntakeQueueItem): string {
  return `${item.channel}-${item.id}`
}

function toMillis(val: IntakeQueueItem['createdAt']): number {
  if (!val) return 0
  if (val instanceof Date) return val.getTime()
  if (typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
    return val.toDate().getTime()
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return new Date(val).getTime()
  }
  return 0
}

function sortOperationalItems(items: IntakeQueueItem[]): IntakeQueueItem[] {
  return [...items].sort((left, right) => {
    const rank = comparePriority(normalizePriority(left.priority), normalizePriority(right.priority))
    if (rank !== 0) return rank
    return toMillis(right.createdAt) - toMillis(left.createdAt)
  })
}

function resolveTeamLabel(
  item: IntakeQueueItem,
  incidentsById: Map<string, IncidentRecord>
): string | null {
  if (item.teamOnDutyLabel) return item.teamOnDutyLabel
  if (item.rawIncident) return getAssignedTeamName(item.rawIncident)
  const report = item.rawEmergencyReport
  if (report?.assignedTeamName) return report.assignedTeamName
  if (report?.incidentId) {
    const linked = incidentsById.get(report.incidentId)
    if (linked) return getAssignedTeamName(linked)
  }
  return null
}

function resolveTeamKey(
  item: IntakeQueueItem,
  incidentsById: Map<string, IncidentRecord>,
  teamCodeByLabel: Map<string, string>
): string {
  const label = resolveTeamLabel(item, incidentsById)
  if (!label) return INCOMING_KEY
  return teamCodeByLabel.get(label) ?? label.toLowerCase()
}

export default function IntakeTeamGroupedList({
  items,
  teams,
  recentIncidents,
  selectedItemId = null,
  selectedItemKey = null,
  duplicateCounts,
  onSelect,
  showEmptyTeams = false,
  emptyTitle = 'No active operational incidents',
  emptyDescription = 'Live emergencies and in-progress cases appear here grouped by operational team.',
}: IntakeTeamGroupedListProps) {
  const incidentsById = useMemo(
    () => new Map(recentIncidents.filter((inc) => inc.id).map((inc) => [inc.id!, inc])),
    [recentIncidents]
  )

  const teamCodeByLabel = useMemo(
    () => new Map(teams.map((team) => [team.label, normalizeTeamCode(team.code)])),
    [teams]
  )

  const uniqueTeams = useMemo(() => {
    const seen = new Set<string>()
    return teams.filter((team) => {
      const code = normalizeTeamCode(team.code)
      if (seen.has(code)) return false
      seen.add(code)
      return true
    })
  }, [teams])

  const groupedSections = useMemo(() => {
    const buckets = new Map<string, IntakeQueueItem[]>()

    items.forEach((item) => {
      const key = resolveTeamKey(item, incidentsById, teamCodeByLabel)
      const list = buckets.get(key) ?? []
      list.push(item)
      buckets.set(key, list)
    })

    const sections: Array<{
      key: string
      label: string
      items: IntakeQueueItem[]
      themeIndex: number
    }> = []

    const incoming = buckets.get(INCOMING_KEY)
    if (incoming?.length) {
      sections.push({
        key: INCOMING_KEY,
        label: 'Incoming',
        items: sortOperationalItems(incoming),
        themeIndex: -1,
      })
    }

    uniqueTeams.forEach((team, index) => {
      const teamCode = normalizeTeamCode(team.code)
      const bucket = buckets.get(teamCode) ?? []
      if (!showEmptyTeams && !bucket.length) return
      sections.push({
        key: teamReactKey(team, index),
        label: team.label,
        items: sortOperationalItems(bucket),
        themeIndex: index,
      })
    })

    // Legacy / unknown team labels
    buckets.forEach((bucket, key) => {
      const normalizedKey = normalizeTeamCode(key)
      if (key === INCOMING_KEY) return
      if (uniqueTeams.some((team) => normalizeTeamCode(team.code) === normalizedKey)) return
      if (!bucket.length) return
      sections.push({
        key: `unknown-${normalizedKey}`,
        label: key,
        items: sortOperationalItems(bucket),
        themeIndex: uniqueTeams.length,
      })
    })

    return sections
  }, [items, uniqueTeams, incidentsById, teamCodeByLabel, showEmptyTeams])

  if (groupedSections.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
        <p className="text-slate-500 text-sm font-medium">{emptyTitle}</p>
        <p className="text-slate-600 text-xs mt-1">{emptyDescription}</p>
      </div>
    )
  }

  const isItemSelected = (item: IntakeQueueItem) => {
    if (selectedItemKey) return selectedItemKey === itemKey(item)
    return selectedItemId === item.id
  }

  return (
    <div className="space-y-3">
      {groupedSections.map((section) => {
        const theme =
          section.themeIndex >= 0 ? getTeamCardTheme(section.label, section.themeIndex) : null
        const headerClass = theme?.accentText ?? 'text-amber-400'
        const sectionEmoji =
          section.key === INCOMING_KEY
            ? '🟡'
            : TEAM_SECTION_EMOJI[section.label] ?? '⚪'

        return (
          <section key={section.key}>
            <div className="mb-1.5 flex items-center justify-between border-b border-slate-800/80 pb-1">
              <h3 className={`text-[11px] font-black uppercase tracking-[0.14em] ${headerClass}`}>
                {sectionEmoji} {section.label}{' '}
                <span className="font-bold normal-case tracking-normal text-slate-500">
                  ({section.items.length} Active)
                </span>
              </h3>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <IntakeListItem
                  key={itemKey(item)}
                  item={item}
                  isSelected={isItemSelected(item)}
                  duplicateCount={
                    item.channel === 'emergency_report' && item.id
                      ? duplicateCounts[item.id]
                      : undefined
                  }
                  onClick={onSelect}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
