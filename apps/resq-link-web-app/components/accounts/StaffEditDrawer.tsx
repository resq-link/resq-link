'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import type { AgencyOption } from '@/lib/agencyTypes';
import type { StaffAccountRecord } from '@/lib/accountTypes';

export function StaffEditDrawer({
  open,
  staff,
  teams,
  agencies,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  staff: StaffAccountRecord | null;
  teams: Array<{ code: string; label: string }>;
  agencies: AgencyOption[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: {
    fullName: string;
    agency: string;
    teamCode: string | null;
    teamLabel: string | null;
  }) => Promise<void> | void;
}) {
  const [fullName, setFullName] = useState('');
  const [agency, setAgency] = useState('BFP');
  const [teamCode, setTeamCode] = useState('');

  useEffect(() => {
    if (!staff) return;
    setFullName(staff.fullName);
    setAgency(staff.agency || agencies[0]?.code || 'BFP');
    setTeamCode(staff.teamCode || '');
  }, [staff, agencies]);

  const selectedTeam = teams.find((team) => team.code === teamCode) || null;
  const agencyChoices = useMemo(() => {
    const map = new Map(agencies.map((item) => [item.code, item]));
    if (staff?.agency && !map.has(staff.agency)) {
      map.set(staff.agency, {
        value: staff.agency,
        code: staff.agency,
        label: staff.agency,
        isActive: false,
      });
    }
    return [...map.values()];
  }, [agencies, staff?.agency]);

  return (
    <Drawer open={open} title="Edit Account" onClose={() => !busy && onClose()}>
      {staff ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              fullName,
              agency,
              teamCode: teamCode || null,
              teamLabel: selectedTeam?.label || null,
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Agency</span>
            <select
              value={agency}
              onChange={(event) => setAgency(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {agencyChoices.map((item) => (
                <option
                  key={item.code}
                  value={item.code}
                  disabled={!item.isActive && item.code !== staff.agency}
                >
                  {item.label} ({item.code})
                  {!item.isActive ? ' — disabled' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Team</span>
            <select
              value={teamCode}
              onChange={(event) => setTeamCode(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {teams.map((team) => (
                <option key={team.code} value={team.code}>
                  {team.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors duration-admin hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white transition-colors duration-admin hover:bg-primary-600 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
