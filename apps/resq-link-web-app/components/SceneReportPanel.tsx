'use client';

import type { SceneReportRecord } from '@packages/firebase';
import {
  getAdditionalResourceLabel,
  getPeopleAffectedDisplay,
  getSituationStatusLabel,
} from '@packages/firebase';
import PostIncidentReportPhotos from '@/components/PostIncidentReportPhotos';

type SceneReportPanelProps = {
  sceneReport?: SceneReportRecord | null;
  responderName?: string | null;
  resourceName?: string | null;
  arrivalTimeLabel?: string | null;
  resolvedAtLabel?: string | null;
};

export default function SceneReportPanel({
  sceneReport,
  responderName,
  resourceName,
  arrivalTimeLabel,
  resolvedAtLabel,
}: SceneReportPanelProps) {
  if (!sceneReport?.submittedAt && !sceneReport?.situationStatus) {
    return (
      <div className="flex min-h-[6rem] items-center justify-center rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-3 text-center">
        <p className="text-xs font-medium text-slate-400">No scene report submitted yet</p>
      </div>
    );
  }

  const peopleDisplay = getPeopleAffectedDisplay(sceneReport);

  return (
    <div className="space-y-3 text-xs leading-snug">
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {responderName ? (
          <>
            <span className="text-slate-500">Responder</span>
            <span className="font-medium text-slate-100">{responderName}</span>
          </>
        ) : null}
        {resourceName ? (
          <>
            <span className="text-slate-500">Unit</span>
            <span className="font-medium text-slate-100">{resourceName}</span>
          </>
        ) : null}
        {arrivalTimeLabel ? (
          <>
            <span className="text-slate-500">Arrival</span>
            <span className="font-medium text-slate-100">{arrivalTimeLabel}</span>
          </>
        ) : null}
        {resolvedAtLabel ? (
          <>
            <span className="text-slate-500">Resolved</span>
            <span className="font-medium text-slate-100">{resolvedAtLabel}</span>
          </>
        ) : null}
        <span className="text-slate-500">Situation</span>
        <span className="font-medium text-slate-100">
          {getSituationStatusLabel(sceneReport.situationStatus)}
        </span>
        {peopleDisplay.mode === 'detailed' ? (
          <>
            <span className="text-slate-500">Injured</span>
            <span className="font-medium text-slate-100">{peopleDisplay.injured ?? 0}</span>
            <span className="text-slate-500">Rescued</span>
            <span className="font-medium text-slate-100">{peopleDisplay.rescued ?? 0}</span>
            <span className="text-slate-500">Fatalities</span>
            <span className="font-medium text-slate-100">{peopleDisplay.fatality ?? 0}</span>
            {peopleDisplay.total != null ? (
              <>
                <span className="text-slate-500">Total</span>
                <span className="font-medium text-slate-100">{peopleDisplay.total}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-slate-500">People</span>
            <span className="font-medium text-slate-100">
              {peopleDisplay.labels}
              {peopleDisplay.total != null ? ` (${peopleDisplay.total})` : ''}
            </span>
            {peopleDisplay.legacyNote ? (
              <span className="col-span-2 text-[11px] text-slate-400">{peopleDisplay.legacyNote}</span>
            ) : null}
          </>
        )}
        <span className="text-slate-500">Actions</span>
        <span className="font-medium text-slate-100">
          {sceneReport.actionsTaken.join(', ')}
          {sceneReport.actionsTakenOther ? ` — ${sceneReport.actionsTakenOther}` : ''}
        </span>
        <span className="text-slate-500">Additional Resources</span>
        <span className="font-medium text-slate-100">
          {sceneReport.additionalResourcesNeeded
            ? getAdditionalResourceLabel(sceneReport.additionalResourceType)
            : 'No'}
          {sceneReport.additionalResourceTypeOther
            ? ` — ${sceneReport.additionalResourceTypeOther}`
            : ''}
        </span>
      </div>

      {sceneReport.remarks ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Remarks
          </p>
          <p className="whitespace-pre-wrap text-slate-200">{sceneReport.remarks}</p>
        </div>
      ) : null}

      {sceneReport.actionPhotoUrl ? (
        <PostIncidentReportPhotos actionPhotoUrl={sceneReport.actionPhotoUrl} />
      ) : null}
    </div>
  );
}
