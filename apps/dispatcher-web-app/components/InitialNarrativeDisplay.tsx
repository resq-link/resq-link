"use client";

import { useMemo } from "react";
import { resolveCivilianNarrativeDisplay } from "@packages/firebase";

type InitialNarrativeDisplayProps = {
  description?: string | null;
  landmark?: string | null;
  peopleInvolved?: number | string | null;
  fieldAssessment?: Record<string, string> | null;
  typeProfile?: string | null;
  incidentType?: string | null;
  compact?: boolean;
  emptyMessage?: string;
  /** When true, landmark is omitted (shown elsewhere on the page, e.g. Location Details). */
  omitLandmark?: boolean;
};

export default function InitialNarrativeDisplay({
  description,
  landmark,
  peopleInvolved,
  fieldAssessment,
  typeProfile,
  incidentType,
  compact = false,
  emptyMessage = "No narrative provided.",
  omitLandmark = false,
}: InitialNarrativeDisplayProps) {
  const { narrative, fields } = useMemo(() => {
    const resolved = resolveCivilianNarrativeDisplay({
      description,
      landmark: omitLandmark ? null : landmark,
      peopleInvolved,
      fieldAssessment,
      typeProfile,
      incidentType,
    });
    if (!omitLandmark) {
      return resolved;
    }
    return {
      ...resolved,
      fields: resolved.fields.filter(
        (field) => field.label.trim().toLowerCase() !== "landmark",
      ),
    };
  }, [
    description,
    landmark,
    peopleInvolved,
    fieldAssessment,
    typeProfile,
    incidentType,
    omitLandmark,
  ]);

  if (!narrative && fields.length === 0) {
    return (
      <p className={`italic text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {narrative ? (
        <p
          className={`whitespace-pre-wrap leading-relaxed text-slate-300 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {narrative}
        </p>
      ) : null}

      {fields.length > 0 ? (
        <div
          className={`grid gap-2 ${
            narrative ? "border-t border-slate-800/60 pt-3" : ""
          }`}
        >
          {fields.map((field) => (
            <div
              key={field.label}
              className={`flex items-center justify-between rounded border border-slate-800/50 bg-slate-900/50 ${
                compact ? "p-2" : "p-2.5"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                {field.label}
              </span>
              <span className="max-w-[55%] text-right text-[10px] font-medium text-slate-200">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
