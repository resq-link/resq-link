'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  createTeam,
  deleteTeam,
  doc,
  getDocs,
  getFirebaseAuth,
  getFirebaseFirestore,
  subscribeToTeams,
  updateDoc,
  type DispatcherAccount,
  type DispatcherRole,
  type TeamRecord,
} from '@packages/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import CommandBar from '@/components/CommandBar'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Plus, Save, Search, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react'

type AccountType = 'DISPATCHER' | 'COMMAND_CENTER'

type TeamMemberRecord = DispatcherAccount & {
  uid: string
  accountType: AccountType
}
type TeamFormState = { code: string; label: string; description: string }
type CreateAccountFormState = { fullName: string; email: string; password: string; role: DispatcherRole; designation: string; teamId: string }
type EditFormState = { fullName: string; role: DispatcherRole; designation: string; teamId: string; active: boolean }

const AGENCY_OPTIONS: DispatcherRole[] = ['BFP', 'PNP', 'MDRRMO', 'AMBULANCE', 'PCG']
const emptyTeamForm: TeamFormState = { code: '', label: '', description: '' }
const emptyCreateAccountForm: CreateAccountFormState = { fullName: '', email: '', password: '', role: 'BFP', designation: 'dispatcher', teamId: '' }

const normalizeOptionalString = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toTeamMemberRecord = (uid: string, data: Record<string, unknown>): TeamMemberRecord => ({
  uid,
  fullName: typeof data.fullName === 'string' ? data.fullName : '',
  email: typeof data.email === 'string' ? data.email : '',
  role: (data.role as DispatcherRole) || 'BFP',
  designation: typeof data.designation === 'string' ? data.designation : null,
  teamCode: typeof data.teamCode === 'string' ? data.teamCode : null,
  teamLabel: typeof data.teamLabel === 'string' ? data.teamLabel : null,
  createdAt: data.createdAt,
  active: data.active !== false,
  accountType: 'DISPATCHER',
})

const toCommandCenterRecord = (uid: string, data: Record<string, unknown>): TeamMemberRecord => ({
  uid,
  fullName: typeof data.name === 'string' ? data.name : '',
  email: typeof data.email === 'string' ? data.email : '',
  role: 'MDRRMO',
  designation: 'command center',
  teamCode: null,
  teamLabel: null,
  createdAt: data.createdAt,
  active: true,
  accountType: 'COMMAND_CENTER',
})

export default function TeamsPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMemberRecord[]>([])
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [designationFilter, setDesignationFilter] = useState('all')
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState<TeamFormState>(emptyTeamForm)
  const [createAccountForm, setCreateAccountForm] = useState<CreateAccountFormState>(emptyCreateAccountForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  const loadMembers = async () => {
    setLoadingMembers(true)
    try {
      const firestore = getFirebaseFirestore()
      const [dispatcherSnapshot, commandCenterSnapshot] = await Promise.all([
        getDocs(collection(firestore, 'dispatchers')),
        getDocs(collection(firestore, 'commandCenters')),
      ])
      const nextMembers = [
        ...dispatcherSnapshot.docs.map((item) => toTeamMemberRecord(item.id, item.data() as Record<string, unknown>)),
        ...commandCenterSnapshot.docs.map((item) => toCommandCenterRecord(item.id, item.data() as Record<string, unknown>)),
      ]
        .sort((left, right) => (left.fullName?.trim() || left.email).localeCompare(right.fullName?.trim() || right.email))
      setMembers(nextMembers)
    } catch (error: any) {
      setPageError(error.message || 'Failed to load team members.')
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    if (!user) return
    void loadMembers()
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToTeams((nextTeams) => {
      setTeams(nextTeams.filter((team) => team.isActive !== false))
      setLoadingTeams(false)
    })
    return unsubscribe
  }, [user])

  const designationOptions = useMemo(() => {
    const unique = new Set<string>()
    members.forEach((member) => {
      if (member.designation?.trim()) unique.add(member.designation.trim())
    })
    return Array.from(unique).sort((left, right) => left.localeCompare(right))
  }, [members])

  const stats = useMemo(() => ({
    totalTeams: teams.length,
    totalMembers: members.length,
    assignedMembers: members.filter((member) => Boolean(member.teamCode || member.teamLabel)).length,
    unassignedMembers: members.filter((member) => !member.teamCode && !member.teamLabel).length,
  }), [members, teams])

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return members.filter((member) => {
      const matchesSearch = !needle ||
        member.fullName?.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle) ||
        (member.designation || '').toLowerCase().includes(needle) ||
        member.role.toLowerCase().includes(needle) ||
        member.accountType.toLowerCase().includes(needle) ||
        (member.teamLabel || member.teamCode || '').toLowerCase().includes(needle)
      const matchesTeam = teamFilter === 'all' || (teamFilter === 'unassigned'
        ? !member.teamCode && !member.teamLabel
        : member.teamLabel === teamFilter || member.teamCode === teamFilter)
      const matchesDesignation = designationFilter === 'all' || (member.designation || '').toLowerCase() === designationFilter.toLowerCase()
      return matchesSearch && matchesTeam && matchesDesignation
    })
  }, [designationFilter, members, search, teamFilter])

  const handleCreateTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatingTeam(true)
    setPageError(null)
    setPageMessage(null)
    try {
      await createTeam({ code: teamForm.code, label: teamForm.label, description: teamForm.description, isActive: true })
      setTeamForm(emptyTeamForm)
      setPageMessage('Team created.')
    } catch (error: any) {
      setPageError(error.message || 'Failed to create team.')
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleDeleteTeam = async (team: TeamRecord) => {
    if (!team.id) return
    const inUse = members.some((member) => member.teamLabel === team.label || member.teamCode === team.code)
    if (inUse) {
      setPageError(`Team "${team.label}" is still assigned to one or more accounts.`)
      return
    }
    if (!window.confirm(`Delete team "${team.label}"?`)) return
    setDeletingTeamId(team.id)
    setPageError(null)
    setPageMessage(null)
    try {
      await deleteTeam(team.id)
      setPageMessage('Team deleted.')
    } catch (error: any) {
      setPageError(error.message || 'Failed to delete team.')
    } finally {
      setDeletingTeamId(null)
    }
  }

  const startEditing = (member: TeamMemberRecord) => {
    const matchedTeam = teams.find((team) => team.label === member.teamLabel || team.code === member.teamCode) || null
    setEditingId(member.uid)
    setEditForm({
      fullName: member.fullName || '',
      role: member.role,
      designation: member.designation || '',
      teamId: matchedTeam?.id || '',
      active: member.active,
    })
    setPageError(null)
    setPageMessage(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const handleSaveMember = async (uid: string) => {
    if (!editForm) return
    const selectedTeam = teams.find((team) => team.id === editForm.teamId) || null
    setSavingId(uid)
    setPageError(null)
    setPageMessage(null)
    try {
      await updateDoc(doc(getFirebaseFirestore(), 'dispatchers', uid), {
        fullName: editForm.fullName.trim(),
        role: editForm.role,
        designation: normalizeOptionalString(editForm.designation),
        teamCode: selectedTeam?.code || null,
        teamLabel: selectedTeam?.label || null,
        active: editForm.active,
      })
      setMembers((current) => current.map((member) => member.uid === uid ? {
        ...member,
        fullName: editForm.fullName.trim(),
        role: editForm.role,
        designation: normalizeOptionalString(editForm.designation),
        teamCode: selectedTeam?.code || null,
        teamLabel: selectedTeam?.label || null,
        active: editForm.active,
      } : member))
      setPageMessage('Team member updated.')
      cancelEditing()
    } catch (error: any) {
      setPageError(error.message || 'Failed to update team member.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreateMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatingAccount(true)
    setPageError(null)
    setPageMessage(null)
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken()
      if (!token) throw new Error('Not signed in.')
      const selectedTeam = teams.find((team) => team.id === createAccountForm.teamId) || null
      const response = await fetch('/api/create-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: createAccountForm.fullName,
          email: createAccountForm.email,
          password: createAccountForm.password,
          role: createAccountForm.role,
          designation: createAccountForm.designation,
          teamCode: selectedTeam?.code || null,
          teamLabel: selectedTeam?.label || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to create team member.')
      setCreateAccountForm(emptyCreateAccountForm)
      setIsCreateAccountOpen(false)
      setPageMessage('Team member account created.')
      await loadMembers()
    } catch (error: any) {
      setPageError(error.message || 'Failed to create team member.')
    } finally {
      setCreatingAccount(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Teams" 
          description="Team assignments and responder account management"
          statsCategory="Personnel"
          stats={[
            { label: 'Teams', value: stats.totalTeams },
            { label: 'Accounts', value: stats.totalMembers, highlight: true },
            { label: 'Assigned', value: stats.assignedMembers },
            { label: 'Unassigned', value: stats.unassignedMembers }
          ]}
        >
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setIsCreateAccountOpen(true); setPageError(null); setPageMessage(null) }}
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-[11px] font-bold text-white transition-colors flex items-center gap-2"
            >
              <UserPlus size={14} />
              <span>CREATE ACCOUNT</span>
            </button>
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">


        <section className="grid gap-4 xl:grid-cols-[1.05fr_1.45fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-100">Create Team</h2>
              <p className="mt-1 text-sm text-slate-400">Add shared teams here. These values are reused by accounts and resources.</p>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team Code</label><input value={teamForm.code} onChange={(event) => setTeamForm((current) => ({ ...current, code: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Whiskey" /></div>
              <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Label</label><input value={teamForm.label} onChange={(event) => setTeamForm((current) => ({ ...current, label: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Whiskey" /></div>
              <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Description</label><textarea value={teamForm.description} onChange={(event) => setTeamForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Optional notes for this team" /></div>
              <button type="submit" disabled={creatingTeam} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60">
                {creatingTeam ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Team
              </button>
            </form>
            <div className="mt-6 border-t border-slate-800 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Defined Teams</h3>
                {loadingTeams ? <Loader2 size={14} className="animate-spin text-slate-500" /> : null}
              </div>
              <div className="space-y-2">
                {teams.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-500">No teams yet.</div> : teams.map((team) => {
                  const assignedCount = members.filter((member) => member.teamLabel === team.label || member.teamCode === team.code).length
                  return (
                    <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-100">{team.label}</p>
                        <p className="text-xs text-slate-500">Code: {team.code} | Assigned members: {assignedCount}</p>
                      </div>
                      <button type="button" onClick={() => handleDeleteTeam(team)} disabled={deletingTeamId === team.id} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-900/60 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60">
                        {deletingTeamId === team.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Team Directory</h2>
                <p className="mt-1 text-sm text-slate-400">Assign accounts to the shared teams and update designations.</p>
              </div>
              <div className="grid gap-2 lg:grid-cols-[1.5fr_0.9fr_0.9fr]">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, designation, agency" className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All teams</option>
                  <option value="unassigned">Unassigned</option>
                  {teams.map((team) => <option key={team.id} value={team.label}>{team.label}</option>)}
                </select>
                <select value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All designations</option>
                  {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                </select>
              </div>
            </div>
            {pageError ? <div className="mb-3 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{pageError}</div> : null}
            {pageMessage ? <div className="mb-3 rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{pageMessage}</div> : null}
            {loadingMembers ? <div className="py-16 text-center"><Loader2 size={28} className="mx-auto animate-spin text-primary-400" /><p className="mt-4 text-slate-400">Loading team members...</p></div> : filteredMembers.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-14 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300"><Users size={20} /></div><p className="text-lg font-medium text-slate-200">No team members found</p><p className="mt-2 text-sm text-slate-500">Change the filters or create an account.</p></div> : <div className="space-y-3">{filteredMembers.map((member) => {
              const isEditing = editingId === member.uid && editForm
                  return <article key={member.uid} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-lg shadow-black/20">
                {!isEditing ? <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-100">{member.fullName?.trim() || member.email}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${member.accountType === 'COMMAND_CENTER' ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-slate-700 bg-slate-900 text-slate-200'}`}>{member.accountType === 'COMMAND_CENTER' ? 'Command Center' : 'Dispatcher'}</span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200">{member.role}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${member.active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{member.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-slate-400">{member.email}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-200">Team: {member.teamLabel || member.teamCode || 'Unassigned'}</span>
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">Designation: {member.designation || 'Not set'}</span>
                    </div>
                  </div>
                  {member.accountType === 'COMMAND_CENTER'
                    ? <div className="inline-flex h-10 items-center justify-center self-start rounded-lg border border-slate-800 px-4 text-sm font-medium text-slate-500">Read only</div>
                    : <button type="button" onClick={() => startEditing(member)} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"><Save size={16} />Edit Assignment</button>}
                </div> : <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Full Name</label><input value={editForm.fullName} onChange={(event) => setEditForm((current) => current ? { ...current, fullName: event.target.value } : current)} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                    <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Agency</label><select value={editForm.role} onChange={(event) => setEditForm((current) => current ? { ...current, role: event.target.value as DispatcherRole } : current)} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">{AGENCY_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</select></div>
                    <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</label><select value={editForm.teamId} onChange={(event) => setEditForm((current) => current ? { ...current, teamId: event.target.value } : current)} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">Unassigned</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}</select></div>
                    <div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Designation</label><input value={editForm.designation} onChange={(event) => setEditForm((current) => current ? { ...current, designation: event.target.value } : current)} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="dispatcher, responder, liaison" /></div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editForm.active} onChange={(event) => setEditForm((current) => current ? { ...current, active: event.target.checked } : current)} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500" />Account is active</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => handleSaveMember(member.uid)} disabled={savingId === member.uid} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60">{savingId === member.uid ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save Changes</button>
                    <button type="button" onClick={cancelEditing} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"><X size={16} />Cancel</button>
                  </div>
                </div>}
              </article>
            })}</div>}
          </div>
        </section>

        {isCreateAccountOpen ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50"><div className="flex items-center justify-between border-b border-slate-800 px-6 py-4"><div><h2 className="text-xl font-semibold text-slate-100">Create Account</h2><p className="mt-1 text-sm text-slate-400">Assign the new account to one of the shared teams.</p></div><button type="button" onClick={() => setIsCreateAccountOpen(false)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"><X size={18} /></button></div><form onSubmit={handleCreateMember} className="space-y-4 p-6"><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Full Name</label><input value={createAccountForm.fullName} onChange={(event) => setCreateAccountForm((current) => ({ ...current, fullName: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Juan Dela Cruz" /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</label><input type="email" required value={createAccountForm.email} onChange={(event) => setCreateAccountForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" /></div><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</label><input type="password" required minLength={6} value={createAccountForm.password} onChange={(event) => setCreateAccountForm((current) => ({ ...current, password: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" /></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Agency</label><select value={createAccountForm.role} onChange={(event) => setCreateAccountForm((current) => ({ ...current, role: event.target.value as DispatcherRole }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">{AGENCY_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</select></div><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</label><select value={createAccountForm.teamId} onChange={(event) => setCreateAccountForm((current) => ({ ...current, teamId: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">Unassigned</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}</select></div></div><div><label className="text-xs uppercase tracking-[0.2em] text-slate-500">Designation</label><input value={createAccountForm.designation} onChange={(event) => setCreateAccountForm((current) => ({ ...current, designation: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="dispatcher, responder, liaison" /></div><div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4"><button type="button" onClick={() => setIsCreateAccountOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500">Cancel</button><button type="submit" disabled={creatingAccount} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60">{creatingAccount ? 'Creating...' : 'Create Account'}</button></div></form></div></div> : null}
        </div>
      </div>
    </ProtectedRoute>
  )
}
