'use client';

import IncidentScenePhotos from '@/components/incident-media/IncidentScenePhotos';

type PostIncidentReportPhotoProps = {
  photoUrl?: string | null;
  label?: string;
  compact?: boolean;
  className?: string;
  hideHint?: boolean;
};

export default function PostIncidentReportPhoto({
  photoUrl,
  label = 'Action Photo',
  compact = false,
  className,
  hideHint = false,
}: PostIncidentReportPhotoProps) {
  if (!photoUrl) return null;

  return (
    <IncidentScenePhotos
      imageUrls={[photoUrl]}
      title={label}
      emptyMessage=""
      compact={compact}
      layout={compact ? 'row' : 'stack'}
      hideHint={hideHint || compact}
      className={className ? `${className} shrink-0` : 'shrink-0'}
    />
  );
}
