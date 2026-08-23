'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { getFirebaseStorage } from '@packages/firebase';

export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function useIncidentPhotoUrl(photoUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(photoUrl ?? null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(photoUrl));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSrc(photoUrl ?? null);
    setLoadFailed(false);
    setIsLoading(Boolean(photoUrl));
  }, [photoUrl]);

  const refreshDownloadUrl = useCallback(async () => {
    if (!photoUrl || isRefreshing) return false;
    const path = extractStoragePathFromUrl(photoUrl);
    if (!path) {
      setLoadFailed(true);
      setIsLoading(false);
      console.error('[IncidentPhoto] Could not parse storage path from URL:', photoUrl);
      return false;
    }

    try {
      setIsRefreshing(true);
      setIsLoading(true);
      const freshUrl = await getDownloadURL(ref(getFirebaseStorage(), path));
      setSrc(freshUrl);
      setLoadFailed(false);
      return true;
    } catch (error) {
      console.error('[IncidentPhoto] Failed to refresh download URL:', error);
      setLoadFailed(true);
      return false;
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [photoUrl, isRefreshing]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setLoadFailed(false);
  }, []);

  const handleError = useCallback(() => {
    if (!isRefreshing) {
      void refreshDownloadUrl();
    } else {
      setLoadFailed(true);
      setIsLoading(false);
    }
  }, [isRefreshing, refreshDownloadUrl]);

  const retry = useCallback(() => {
    setLoadFailed(false);
    setIsLoading(true);
    void refreshDownloadUrl();
  }, [refreshDownloadUrl]);

  return {
    src: src ?? photoUrl ?? null,
    loadFailed,
    isLoading,
    isRefreshing,
    handleLoad,
    handleError,
    retry,
  };
}
