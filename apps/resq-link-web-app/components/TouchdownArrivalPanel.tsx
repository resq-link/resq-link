'use client';

import type { IncidentRecord, EmergencyReport } from '@packages/firebase';
import IncidentScenePhotos from '@/components/incident-media/IncidentScenePhotos';

type TouchdownArrivalPanelProps = {
  incident?: IncidentRecord | null;
  report?: EmergencyReport | null;
};

const getDateLabel = (value: unknown) => {
  if (!value) return '—';
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && value && 'toDate' in value
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function TouchdownArrivalPanel({ incident, report }: TouchdownArrivalPanelProps) {
  const touchdownAt = incident?.touchdownAt || report?.touchdownAt || null;
  const onScenePhotoUrl =
    incident?.onScenePhotoUrl?.trim() || report?.onScenePhotoUrl?.trim() || null;
  const uploadedBy =
    incident?.onScenePhotoUploadedBy?.trim() ||
    incident?.touchdownByName?.trim() ||
    report?.touchdownByName?.trim() ||
    null;

  if (!touchdownAt) {
    return (
      <div className="flex h-full min-h-[7rem] items-center justify-center rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-3 text-center">
        <div>
          <p className="text-xs font-medium text-slate-400">No touchdown recorded yet</p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Arrival evidence appears here after Touchdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-stretch gap-3">
      <div className="grid min-w-0 flex-1 content-start grid-cols-[auto_1fr] gap-x-3 gap-y-1 self-start text-xs leading-snug">
        <span className="text-slate-500">Status</span>
        <span className="font-medium text-emerald-300">Arrived on Scene</span>
        <span className="text-slate-500">Time</span>
        <span className="min-w-0 break-words font-medium text-slate-100">
          {getDateLabel(touchdownAt)}
        </span>
        {uploadedBy ? (
          <>
            <span className="text-slate-500">By</span>
            <span className="min-w-0 break-all font-medium text-slate-100">{uploadedBy}</span>
          </>
        ) : null}
      </div>

      <div className="flex w-[9.5rem] shrink-0 items-start justify-end sm:w-[11rem]">
        {onScenePhotoUrl ? (
          <IncidentScenePhotos
            imageUrls={[onScenePhotoUrl]}
            title=""
            layout="stack"
            compact
            hideHint
            className="w-full"
            photoAltLabel="On-scene arrival photo"
          />
        ) : (
          <p className="pt-1 text-right text-[11px] italic text-slate-500">No on-scene photo</p>
        )}
      </div>
    </div>
  );
}
