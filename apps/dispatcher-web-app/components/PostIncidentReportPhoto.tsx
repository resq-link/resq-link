'use client';

import { useEffect, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { getFirebaseStorage } from '@packages/firebase';

function extractStoragePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

type PostIncidentReportPhotoProps = {
  photoUrl?: string | null;
  alt?: string;
  className?: string;
};

export default function PostIncidentReportPhoto({
  photoUrl,
  alt = 'Post-incident scene photo',
  className = 'w-full h-auto object-cover max-h-[280px]',
}: PostIncidentReportPhotoProps) {
  const [src, setSrc] = useState<string | null>(photoUrl ?? null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSrc(photoUrl ?? null);
    setLoadFailed(false);
  }, [photoUrl]);

  const refreshDownloadUrl = async () => {
    if (!photoUrl || isRefreshing) return;
    const path = extractStoragePathFromUrl(photoUrl);
    if (!path) {
      setLoadFailed(true);
      return;
    }

    try {
      setIsRefreshing(true);
      const freshUrl = await getDownloadURL(ref(getFirebaseStorage(), path));
      setSrc(freshUrl);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!photoUrl) return null;

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/90 border-b border-slate-800">
        Scene photo
      </p>
      {!loadFailed ? (
        <img
          src={src ?? photoUrl}
          alt={alt}
          className={className}
          onError={() => {
            if (!isRefreshing) {
              void refreshDownloadUrl();
            } else {
              setLoadFailed(true);
            }
          }}
        />
      ) : (
        <div className="p-6 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Scene photo is stored but could not be loaded. Ensure Firebase Storage rules allow
            read access for <span className="font-mono text-slate-400">post-reports/</span>.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadFailed(false);
              void refreshDownloadUrl();
            }}
            className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
