'use client';

import { useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ResponderAssessmentRecord } from '@packages/firebase';
import {
  getSceneAssessmentEntries,
  hasResponderSceneAssessment,
} from '@packages/firebase';
import IncidentScenePhotos from '@/components/incident-media/IncidentScenePhotos';

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
      <div className="flex min-h-[120px] items-center justify-center gap-2 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-4 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-xs font-medium">Loading assessment…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-red-900/40 bg-red-950/20 p-4 text-center">
        <p className="text-sm font-medium text-red-300">Unable to load scene assessment</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!hasAssessment) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center">
        <AlertTriangle className="mb-2 h-7 w-7 text-slate-700" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-400">No on-scene assessment yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Responder scene assessment will appear here once submitted.
        </p>
      </div>
    );
  }

  return (
    <div>
      {assessment?.updatedAt || assessment?.updatedByName ? (
        <div className="mb-3 space-y-0.5 text-xs text-emerald-400">
          {assessment.updatedByName ? (
            <p>
              Submitted by{' '}
              <span className="font-medium text-emerald-300">{assessment.updatedByName}</span>
            </p>
          ) : null}
          {assessment.updatedAt ? (
            <p className="text-slate-500">Submitted {getDateLabel(assessment.updatedAt)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid w-full grid-cols-[minmax(6.5rem,auto)_1fr] items-start gap-x-4 gap-y-3 text-[13px] leading-snug">
        {entries.map((field) => (
          <div key={field.key} className="contents">
            <span className="font-medium text-slate-500">{field.label}</span>
            <span className="min-w-0 break-words text-right font-medium text-slate-100">
              {field.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-800/80 pt-3">
        {assessment?.scenePhotoUrl ? (
          <IncidentScenePhotos
            imageUrls={[assessment.scenePhotoUrl]}
            title="On-Scene Photo"
            layout="stack"
            emptyMessage=""
          />
        ) : (
          <p className="text-[11px] italic text-slate-500">No on-scene photo submitted.</p>
        )}
      </div>
    </div>
  );
}
