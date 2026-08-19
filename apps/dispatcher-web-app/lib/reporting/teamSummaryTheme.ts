export type TeamCardTheme = {
  name: string
  accentLeft: string
  accentText: string
  accentBadge: string
  glow: string
}

const TEAM_THEME_PALETTE: TeamCardTheme[] = [
  {
    name: 'default-0',
    accentLeft: 'border-l-blue-500',
    accentText: 'text-blue-400',
    accentBadge: 'bg-blue-500/15 text-blue-300 ring-blue-500/25',
    glow: 'shadow-[0_4px_24px_rgba(59,130,246,0.14),0_2px_8px_rgba(0,0,0,0.35)]',
  },
  {
    name: 'default-1',
    accentLeft: 'border-l-emerald-500',
    accentText: 'text-emerald-400',
    accentBadge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
    glow: 'shadow-[0_4px_24px_rgba(16,185,129,0.14),0_2px_8px_rgba(0,0,0,0.35)]',
  },
  {
    name: 'default-2',
    accentLeft: 'border-l-orange-500',
    accentText: 'text-orange-400',
    accentBadge: 'bg-orange-500/15 text-orange-300 ring-orange-500/25',
    glow: 'shadow-[0_4px_24px_rgba(249,115,22,0.14),0_2px_8px_rgba(0,0,0,0.35)]',
  },
  {
    name: 'default-3',
    accentLeft: 'border-l-violet-500',
    accentText: 'text-violet-400',
    accentBadge: 'bg-violet-500/15 text-violet-300 ring-violet-500/25',
    glow: 'shadow-[0_4px_24px_rgba(139,92,246,0.14),0_2px_8px_rgba(0,0,0,0.35)]',
  },
]

const KNOWN_TEAM_THEMES: Record<string, TeamCardTheme> = {
  Whiskey: TEAM_THEME_PALETTE[0],
  'X-ray': TEAM_THEME_PALETTE[1],
  Yankee: TEAM_THEME_PALETTE[2],
  Zulu: TEAM_THEME_PALETTE[3],
}

export function getTeamCardTheme(teamLabel: string, index = 0): TeamCardTheme {
  const known = KNOWN_TEAM_THEMES[teamLabel]
  if (known) return { ...known, name: teamLabel }

  const palette = TEAM_THEME_PALETTE[index % TEAM_THEME_PALETTE.length]
  return { ...palette, name: teamLabel }
}

export type TeamCardStatRow = {
  label: string
  value: string
  isNumeric: boolean
  isMuted: boolean
}

export function getTeamCardDisplay(card: {
  completed: number
  criticalCases: number
  topIncidentType: string
  avgResponseTime?: string
  avgResolutionTime?: string
}): TeamCardStatRow[] {
  const hasType = Boolean(card.topIncidentType && card.topIncidentType !== '—')

  return [
    {
      label: 'Completed',
      value: card.completed > 0 ? String(card.completed) : 'No Completed Incidents',
      isNumeric: card.completed > 0,
      isMuted: card.completed === 0,
    },
    {
      label: 'Critical',
      value: card.criticalCases > 0 ? String(card.criticalCases) : 'No Critical Cases',
      isNumeric: card.criticalCases > 0,
      isMuted: card.criticalCases === 0,
    },
    {
      label: 'Avg Response',
      value: card.avgResponseTime && card.avgResponseTime !== '—' ? card.avgResponseTime : '—',
      isNumeric: Boolean(card.avgResponseTime && card.avgResponseTime !== '—'),
      isMuted: !card.avgResponseTime || card.avgResponseTime === '—',
    },
    {
      label: 'Avg Resolution',
      value:
        card.avgResolutionTime && card.avgResolutionTime !== '—' ? card.avgResolutionTime : '—',
      isNumeric: Boolean(card.avgResolutionTime && card.avgResolutionTime !== '—'),
      isMuted: !card.avgResolutionTime || card.avgResolutionTime === '—',
    },
    {
      label: 'Top Type',
      value: hasType ? card.topIncidentType : 'No Incident Type',
      isNumeric: false,
      isMuted: !hasType,
    },
  ]
}
