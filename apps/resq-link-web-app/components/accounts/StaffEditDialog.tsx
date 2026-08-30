'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import type { AgencyOption } from '@/lib/agencyTypes';
import type { StaffAccountRecord } from '@/lib/accountTypes';
import { teamOptionKey } from '@/lib/operational/teamUtils';

export function StaffEditDialog({
  open,
  kind = 'responder',
  staff,
  teams,
  agencies,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  kind?: 'dispatcher' | 'responder';
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
  const isResponder = kind === 'responder';
  const [fullName, setFullName] = useState('');
  const [agency, setAgency] = useState('BFP');
  const [teamCode, setTeamCode] = useState('');

  useEffect(() => {
    if (!open || !staff) return;
    setFullName(staff.fullName);
    setAgency(staff.agency || agencies[0]?.code || 'BFP');
    setTeamCode(staff.teamCode || '');
  }, [open, staff, agencies]);

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

  const title = isResponder ? 'Edit Responder' : 'Edit Dispatcher';

  return (
    <Dialog open={open} title={title} onClose={() => !busy && onClose()} widthClassName="max-w-lg">
      {staff ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({
              fullName,
              agency: isResponder ? agency : staff.agency || '',
              teamCode: isResponder ? teamCode || null : null,
              teamLabel: isResponder ? selectedTeam?.label || null : null,
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Name</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Email</span>
            <input
              value={staff.email}
              disabled
              className="h-10 w-full rounded-lg border border-admin-border bg-admin-muted px-3 text-sm text-admin-fg-subtle"
            />
          </label>

          {isResponder ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Agency</span>
                <select
                  required
                  value={agency}
                  onChange={(event) => setAgency(event.target.value)}
                  className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
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
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white transition-colors duration-admin hover:bg-primary-600 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}

/** @deprecated Use StaffEditDialog — kept for any lingering imports. */
export const StaffEditDrawer = StaffEditDialog;
