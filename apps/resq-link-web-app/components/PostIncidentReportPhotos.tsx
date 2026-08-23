'use client';

import IncidentScenePhotos from '@/components/incident-media/IncidentScenePhotos';

type PostIncidentReportPhotosProps = {
  /** Pre-migration on-scene photo stored in postIncidentReport.photoUrl */
  onScenePhotoUrl?: string | null;
  actionPhotoUrl?: string | null;
  onScenePhotoBy?: string | null;
};

export default function PostIncidentReportPhotos({
  onScenePhotoUrl,
  actionPhotoUrl,
  onScenePhotoBy,
}: PostIncidentReportPhotosProps) {
  const onScene = onScenePhotoUrl?.trim() || null;
  const action = actionPhotoUrl?.trim() || null;

  if (!onScene && !action) {
    return (
      <div className="border-t border-slate-800/60 pt-3">
        <p className="text-[11px] italic text-slate-500">No responder photos submitted.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800/60 pt-3">
      <div className="flex flex-row flex-nowrap items-start gap-4 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {onScene ? (
          <div className="shrink-0">
            <IncidentScenePhotos
              imageUrls={[onScene]}
              title="On-Scene Photo"
              layout="row"
              hideHint
              photoAltLabel="On-scene photo"
            />
            {onScenePhotoBy ? (
              <p className="mt-1 text-[10px] text-slate-500">
                By{' '}
                <span className="font-medium text-slate-400">{onScenePhotoBy}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        {action ? (
          <div className="shrink-0">
            <IncidentScenePhotos
              imageUrls={[action]}
              title="Action Photo"
              layout="row"
              hideHint
              photoAltLabel="Action photo"
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Click to view full image</p>
    </div>
  );
}
