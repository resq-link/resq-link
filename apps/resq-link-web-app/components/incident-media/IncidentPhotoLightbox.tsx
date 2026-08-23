'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, X } from 'lucide-react';
import { useIncidentPhotoUrl } from './useIncidentPhotoUrl';

type IncidentPhotoLightboxProps = {
  open: boolean;
  imageUrls: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
};

function LightboxImage({
  url,
  alt,
  onResolvedUrl,
}: {
  url: string;
  alt: string;
  onResolvedUrl?: (resolvedUrl: string) => void;
}) {
  const { src, loadFailed, isLoading, handleLoad, handleError, retry } = useIncidentPhotoUrl(url);
  const displaySrc = src ?? url;

  useEffect(() => {
    if (displaySrc) {
      onResolvedUrl?.(displaySrc);
    }
  }, [displaySrc, onResolvedUrl]);

  if (loadFailed) {
    return (
      <div className="flex max-h-[85vh] max-w-[95vw] flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-8 py-12 text-center">
        <p className="text-sm font-medium text-slate-300">Unable to load scene photo</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          The image may be unavailable or access may have expired.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex max-h-[85vh] max-w-[95vw] items-center justify-center">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden="true" />
          <span className="sr-only">Loading photo</span>
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        className={`max-h-[85vh] max-w-[95vw] rounded-lg object-contain shadow-2xl transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ imageOrientation: 'from-image' }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default function IncidentPhotoLightbox({
  open,
  imageUrls,
  initialIndex = 0,
  title = 'Scene Photo',
  onClose,
}: IncidentPhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
      setResolvedUrls({});
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (imageUrls.length > 1 && event.key === 'ArrowLeft') {
        setActiveIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length);
      }
      if (imageUrls.length > 1 && event.key === 'ArrowRight') {
        setActiveIndex((index) => (index + 1) % imageUrls.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, imageUrls.length]);

  if (!open || !mounted || imageUrls.length === 0) return null;

  const currentUrl = resolvedUrls[activeIndex] ?? imageUrls[activeIndex];
  const hasMultiple = imageUrls.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close viewer"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
          {hasMultiple ? (
            <p className="text-[11px] text-slate-500">
              {activeIndex + 1} of {imageUrls.length}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open Original
          </a>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        {hasMultiple ? (
          <button
            type="button"
            onClick={() =>
              setActiveIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)
            }
            className="absolute left-2 z-20 rounded-full border border-slate-700 bg-slate-900/90 p-2 text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 sm:left-4"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}

        <LightboxImage
          url={imageUrls[activeIndex]}
          alt={`${title} ${activeIndex + 1}`}
          onResolvedUrl={(resolvedUrl) =>
            setResolvedUrls((current) =>
              current[activeIndex] === resolvedUrl
                ? current
                : { ...current, [activeIndex]: resolvedUrl },
            )
          }
        />

        {hasMultiple ? (
          <button
            type="button"
            onClick={() => setActiveIndex((index) => (index + 1) % imageUrls.length)}
            className="absolute right-2 z-20 rounded-full border border-slate-700 bg-slate-900/90 p-2 text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 sm:right-4"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
