'use client';

import PostIncidentReportPhoto from '@/components/PostIncidentReportPhoto';

type PostIncidentReportPhotosProps = {
  actionPhotoUrl?: string | null;
  /** Pre-migration post-report photoUrl — shown read-only when distinct from action photo */
  legacyPhotoUrl?: string | null;
};

export default function PostIncidentReportPhotos({
  actionPhotoUrl,
  legacyPhotoUrl,
}: PostIncidentReportPhotosProps) {
  const showLegacy =
    Boolean(legacyPhotoUrl?.trim()) && legacyPhotoUrl?.trim() !== actionPhotoUrl?.trim();

  if (!actionPhotoUrl?.trim() && !showLegacy) {
    return (
      <p className="text-[11px] italic text-slate-500">No action photo submitted.</p>
    );
  }

  return (
    <div className="space-y-3">
      {actionPhotoUrl?.trim() ? (
        <PostIncidentReportPhoto photoUrl={actionPhotoUrl} label="Action Photo" compact />
      ) : (
        <p className="text-[11px] italic text-slate-500">No action photo submitted.</p>
      )}

      {showLegacy ? (
        <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/40 p-2">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Legacy report photo (read-only)
          </p>
          <PostIncidentReportPhoto photoUrl={legacyPhotoUrl} label="Legacy report photo" compact hideHint />
        </div>
      ) : null}

      {actionPhotoUrl?.trim() || showLegacy ? (
        <p className="text-[10px] text-slate-500">Click to view full image</p>
      ) : null}
    </div>
  );
}
