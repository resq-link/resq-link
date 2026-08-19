'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ensureDefaultOperationalTeams,
  incidentMatchesTeamFilter,
  setCommandCenterCurrentTeamOnDuty,
  sortTeamsByOrder,
  subscribeToCommandCenterCurrentTeamOnDuty,
  subscribeToTeams,
  type CurrentTeamOnDutyState,
  type IncidentRecord,
  type TeamRecord,
} from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'

type ListTeamFilter = 'all' | string

type OperationalTeamContextValue = {
  teams: TeamRecord[]
  isLoading: boolean
  currentTeamOnDuty: CurrentTeamOnDutyState | null
  isCurrentTeamLoading: boolean
  isSavingCurrentTeam: boolean
  setCurrentTeamOnDuty: (teamId: string) => Promise<void>
  requireCurrentTeamId: () => string
  listTeamFilter: ListTeamFilter
  setListTeamFilter: (value: ListTeamFilter) => void
  /** @deprecated use listTeamFilter */
  teamFilter: ListTeamFilter
  /** @deprecated use setListTeamFilter */
  setTeamFilter: (value: ListTeamFilter) => void
  incidentMatchesFilter: (incident: IncidentRecord) => boolean
  getTeamLabel: (codeOrId: string) => string
}

const OperationalTeamContext = createContext<OperationalTeamContextValue | null>(null)

const LIST_FILTER_KEY = 'resq-link-list-team-filter'

export function OperationalTeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTeamOnDuty, setCurrentTeamOnDutyState] = useState<CurrentTeamOnDutyState | null>(null)
  const [isCurrentTeamLoading, setIsCurrentTeamLoading] = useState(true)
  const [isSavingCurrentTeam, setIsSavingCurrentTeam] = useState(false)
  const [listTeamFilter, setListTeamFilterState] = useState<ListTeamFilter>('all')

  useEffect(() => {
    const stored = sessionStorage.getItem(LIST_FILTER_KEY)
    if (stored) setListTeamFilterState(stored)
  }, [])

  const setListTeamFilter = useCallback((value: ListTeamFilter) => {
    setListTeamFilterState(value)
    sessionStorage.setItem(LIST_FILTER_KEY, value)
  }, [])

  useEffect(() => {
    if (!user) {
      setTeams([])
      setCurrentTeamOnDutyState(null)
      setIsLoading(false)
      setIsCurrentTeamLoading(false)
      return
    }

    let cancelled = false

    ensureDefaultOperationalTeams().catch((error) => {
      console.warn('Could not seed default operational teams:', error)
    })

    const unsubscribeTeams = subscribeToTeams((nextTeams) => {
      if (cancelled) return
      setTeams(sortTeamsByOrder(nextTeams.filter((team) => team.isActive !== false)))
      setIsLoading(false)
    })

    const unsubscribeShift = subscribeToCommandCenterCurrentTeamOnDuty(user.uid, (state) => {
      if (cancelled) return
      setCurrentTeamOnDutyState(state)
      setIsCurrentTeamLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribeTeams()
      unsubscribeShift()
    }
  }, [user])

  const setCurrentTeamOnDuty = useCallback(
    async (teamId: string) => {
      setIsSavingCurrentTeam(true)
      try {
        const next = await setCommandCenterCurrentTeamOnDuty(teamId, {
          setByName: user?.displayName || user?.email || null,
        })
        setCurrentTeamOnDutyState(next)
      } finally {
        setIsSavingCurrentTeam(false)
      }
    },
    [user]
  )

  const requireCurrentTeamId = useCallback(() => {
    if (!currentTeamOnDuty?.teamId) {
      throw new Error('Set the Current Team on Duty before creating or accepting incidents.')
    }
    return currentTeamOnDuty.teamId
  }, [currentTeamOnDuty])

  const incidentMatchesFilter = useCallback(
    (incident: IncidentRecord) => incidentMatchesTeamFilter(incident, listTeamFilter),
    [listTeamFilter]
  )

  const getTeamLabel = useCallback(
    (codeOrId: string) => {
      const match = teams.find(
        (team) => team.id === codeOrId || team.code === codeOrId || team.label === codeOrId
      )
      return match?.label ?? codeOrId
    },
    [teams]
  )

  const value = useMemo(
    () => ({
      teams,
      isLoading,
      currentTeamOnDuty,
      isCurrentTeamLoading,
      isSavingCurrentTeam,
      setCurrentTeamOnDuty,
      requireCurrentTeamId,
      listTeamFilter,
      setListTeamFilter,
      teamFilter: listTeamFilter,
      setTeamFilter: setListTeamFilter,
      incidentMatchesFilter,
      getTeamLabel,
    }),
    [
      teams,
      isLoading,
      currentTeamOnDuty,
      isCurrentTeamLoading,
      isSavingCurrentTeam,
      setCurrentTeamOnDuty,
      requireCurrentTeamId,
      listTeamFilter,
      setListTeamFilter,
      incidentMatchesFilter,
      getTeamLabel,
    ]
  )

  return (
    <OperationalTeamContext.Provider value={value}>{children}</OperationalTeamContext.Provider>
  )
}

export function useOperationalTeams() {
  const context = useContext(OperationalTeamContext)
  if (!context) {
    throw new Error('useOperationalTeams must be used within OperationalTeamProvider')
  }
  return context
}
