'use client';

import { useEffect, useState } from 'react';
import { Expand, ImageIcon, Loader2 } from 'lucide-react';
import IncidentPhotoLightbox from './IncidentPhotoLightbox';
import { useIncidentPhotoUrl } from './useIncidentPhotoUrl';

type PhotoLayout = 'stack' | 'grid' | 'row';

type IncidentScenePhotosProps = {
  imageUrls: string[];
  /** Section heading, e.g. "Scene Photo" or "Scene Photos" */
  title?: string;
  emptyMessage?: string;
  className?: string;
  /** stack = shrink-wrapped single preview; row = horizontal gallery; grid = responsive grid */
  layout?: PhotoLayout;
  /** Smaller previews for paired post-report photos */
  compact?: boolean;
  /** Hide the "Click to view full image" hint (use when grouped with other photos) */
  hideHint?: boolean;
  onViewerOpenChange?: (open: boolean) => void;
};

const PREVIEW_SIZE = {
  default: 'max-h-64 max-w-[min(100%,18rem)] sm:max-w-sm',
  compact: 'max-h-36 max-w-[10rem]',
  row: 'max-h-48 max-w-[11rem]',
  rowCompact: 'max-h-36 max-w-[9rem]',
} as const;

function ScenePhotoThumbnail({
  url,
  index,
  total,
  onOpen,
  compact = false,
  inRow = false,
}: {
  url: string;
  index: number;
  total: number;
  onOpen: () => void;
  compact?: boolean;
  inRow?: boolean;
}) {
  const { src, loadFailed, isLoading, handleLoad, handleError, retry } = useIncidentPhotoUrl(url);
  const alt = total === 1 ? 'Scene photo' : `Scene photo ${index + 1}`;
  const sizeClass = inRow
    ? compact
      ? PREVIEW_SIZE.rowCompact
      : PREVIEW_SIZE.row
    : compact
      ? PREVIEW_SIZE.compact
      : PREVIEW_SIZE.default;

  if (loadFailed) {
    return (
      <div
        className={`flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-6 text-center ${
          inRow ? 'w-[11rem] shrink-0' : 'w-full max-w-sm'
        }`}
      >
        <p className="text-xs font-medium text-slate-400">Unable to load scene photo</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative inline-flex cursor-zoom-in flex-col items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        inRow ? 'shrink-0' : compact ? 'min-w-0 w-full max-w-full' : ''
      }`}
      aria-label={`View ${alt} at full size`}
    >
      <span
        className={`relative inline-flex overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80 ${
          isLoading ? 'min-h-[10rem] min-w-[8rem]' : ''
        } ${compact && !inRow ? 'w-full justify-center' : ''}`}
      >
        {isLoading ? (
          <span className="absolute inset-0 flex items-center justify-center gap-2 px-4 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-[11px] font-medium">Loading photo…</span>
          </span>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src ?? url}
          alt={alt}
          className={`block h-auto w-auto object-contain ${sizeClass} transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ imageOrientation: 'from-image' }}
          onLoad={handleLoad}
          onError={handleError}
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors duration-200 group-hover:bg-slate-950/45 group-focus-visible:bg-slate-950/45"
          aria-hidden="true"
        >
          <span className="flex translate-y-1 items-center gap-1.5 rounded-md bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-200 opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <Expand className="h-3 w-3" />
            View photo
          </span>
        </span>
      </span>
    </button>
  );
}

function resolveGalleryLayout(
  layout: PhotoLayout,
  compact: boolean,
  count: number,
): { className: string; inRow: boolean } {
  if (layout === 'row' || (layout === 'stack' && count > 1)) {
    return {
      className:
        'flex flex-row flex-nowrap items-start gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]',
      inRow: true,
    };
  }

  if (compact) {
    return {
      className: 'flex flex-row flex-nowrap items-start gap-2 overflow-x-auto pb-0.5',
      inRow: true,
    };
  }

  if (layout === 'grid') {
    return {
      className: 'grid gap-3 sm:grid-cols-2',
      inRow: false,
    };
  }

  return {
    className: 'flex flex-wrap items-start gap-3',
    inRow: false,
  };
}

export default function IncidentScenePhotos({
  imageUrls,
  title,
  emptyMessage = 'No photos attached.',
  className = '',
  layout = 'stack',
  compact = false,
  hideHint = false,
  onViewerOpenChange,
}: IncidentScenePhotosProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    onViewerOpenChange?.(lightboxIndex !== null);
  }, [lightboxIndex, onViewerOpenChange]);

  const resolvedTitle =
    title ?? (imageUrls.length === 1 ? 'Scene Photo' : 'Scene Photos');

  if (imageUrls.length === 0) {
    return emptyMessage ? (
      <p className={`text-[11px] italic text-slate-500 ${className}`}>{emptyMessage}</p>
    ) : null;
  }

  const { className: galleryClass, inRow } = resolveGalleryLayout(layout, compact, imageUrls.length);

  return (
    <div className={className}>
      {title !== '' ? (
        <div className="mb-2 flex items-center gap-1.5 text-slate-400">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest">{resolvedTitle}</span>
        </div>
      ) : null}

      <div className={galleryClass}>
        {imageUrls.map((url, index) => (
          <ScenePhotoThumbnail
            key={`${url}-${index}`}
            url={url}
            index={index}
            total={imageUrls.length}
            compact={compact}
            inRow={inRow}
            onOpen={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {!hideHint ? (
        <p className="mt-2 text-[10px] text-slate-500">Click to view full image</p>
      ) : null}

      <IncidentPhotoLightbox
        open={lightboxIndex !== null}
        imageUrls={imageUrls}
        initialIndex={lightboxIndex ?? 0}
        title={resolvedTitle}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
