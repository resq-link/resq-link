'use client';

import { useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ResponderAssessmentRecord } from '@packages/firebase';
import {
  getSceneAssessmentEntries,
  hasResponderSceneAssessment,
} from '@packages/firebase';

type SceneAssessmentPanelProps = {
  assessment: ResponderAssessmentRecord | null | undefined;
  incidentType?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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

export default function SceneAssessmentPanel({
  assessment,
  incidentType,
  isLoading = false,
  error = null,
  onRetry,
}: SceneAssessmentPanelProps) {
  const entries = useMemo(
    () => getSceneAssessmentEntries(assessment, incidentType),
    [assessment, incidentType],
  );

  const hasAssessment = hasResponderSceneAssessment(assessment);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[7rem] items-center justify-center gap-2 rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-3 text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span className="text-[11px] font-medium">Loading assessment…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[7rem] flex-col items-center justify-center rounded-md border border-dashed border-red-900/40 bg-red-950/20 px-3 py-3 text-center">
        <p className="text-xs font-medium text-red-300">Unable to load scene assessment</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!hasAssessment) {
    return (
      <div className="flex h-full min-h-[7rem] flex-col items-center justify-center rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-3 text-center">
        <div className="mb-1 flex items-center justify-center gap-1.5 text-slate-500">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-400">No scene assessment yet</p>
        </div>
        <p className="text-[10px] text-slate-500">Appears here once the responder submits.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-2">
      {(assessment?.updatedAt || assessment?.updatedByName) && (
        <p className="text-[11px] leading-snug text-emerald-400/90">
          {assessment.updatedByName ? (
            <>
              Submitted by{' '}
              <span className="font-medium text-emerald-300">{assessment.updatedByName}</span>
            </>
          ) : (
            'Submitted'
          )}
          {assessment.updatedAt ? (
            <span className="text-slate-500"> · {getDateLabel(assessment.updatedAt)}</span>
          ) : null}
        </p>
      )}

      <div className="grid w-full grid-cols-[minmax(6rem,auto)_1fr] items-start gap-x-3 gap-y-1 text-xs leading-snug">
        {entries.map((field) => (
          <div key={field.key} className="contents">
            <span className="text-slate-500">{field.label}</span>
            <span className="min-w-0 break-words text-right font-medium text-slate-100">
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
