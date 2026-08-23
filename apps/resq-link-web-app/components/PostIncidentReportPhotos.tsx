'use client';

import IncidentScenePhotos from '@/components/incident-media/IncidentScenePhotos';

type PostIncidentReportPhotosProps = {
  actionPhotoUrl?: string | null;
};

export default function PostIncidentReportPhotos({
  actionPhotoUrl,
}: PostIncidentReportPhotosProps) {
  const action = actionPhotoUrl?.trim() || null;

  if (!action) {
    return (
      <div className="border-t border-slate-800/60 pt-2">
        <p className="text-[11px] italic text-slate-500">No action photo submitted.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-t border-slate-800/60 pt-2">
      <div className="min-w-0 pt-0.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Action Photo
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">Click photo to enlarge</p>
      </div>
      <IncidentScenePhotos
        imageUrls={[action]}
        title=""
        layout="stack"
        compact
        hideHint
        className="shrink-0"
        photoAltLabel="Post-report action photo"
      />
    </div>
  );
}
