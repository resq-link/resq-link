'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Loader2 } from 'lucide-react';
import type { AgencyOption } from '@/lib/agencyTypes';
import { teamOptionKey } from '@/lib/operational/teamUtils';

export function CreateStaffDialog({
  open,
  kind,
  teams,
  agencies,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  kind: 'dispatcher' | 'responder';
  teams: Array<{ code: string; label: string }>;
  agencies: AgencyOption[];
  busy: boolean;
  onClose: () => void;
  onCreate: (input: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    teamCode?: string | null;
    teamLabel?: string | null;
  }) => Promise<void>;
}) {
  const defaultAgency = agencies[0]?.code || 'BFP';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(defaultAgency);
  const [teamCode, setTeamCode] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setFullName('');
      setRole(agencies[0]?.code || 'BFP');
      setTeamCode('');
    }
  }, [open, agencies]);

  const selectedTeam = teams.find((team) => team.code === teamCode) || null;
  const title = kind === 'dispatcher' ? 'Add Dispatcher' : 'Add Responder';
  const isResponder = kind === 'responder';

  return (
    <Dialog open={open} title={title} onClose={() => !busy && onClose()} widthClassName="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate(
            isResponder
              ? {
                  email,
                  password,
                  fullName,
                  role,
                  teamCode: teamCode || null,
                  teamLabel: selectedTeam?.label || null,
                }
              : {
                  email,
                  password,
                  fullName,
                }
          );
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
            placeholder={isResponder ? undefined : 'Command Center'}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
          />
        </label>
        {isResponder ? (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Agency *</span>
              <select
                required
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
              >
                {agencies.map((agency) => (
                  <option key={agency.code} value={agency.code}>
                    {agency.label} ({agency.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Team</span>
              <select
                value={teamCode}
                onChange={(event) => setTeamCode(event.target.value)}
                className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {teams.map((team, index) => (
                  <option key={teamOptionKey(team, index)} value={team.code}>
                    {team.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-admin-fg-muted transition-colors duration-admin hover:bg-admin-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (isResponder && agencies.length === 0)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white transition-colors duration-admin hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Creating...' : title}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
