import { getFirebaseAuth } from '@packages/firebase';
import { readApiError } from './errors';

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) {
    throw new Error('Your session expired. Please sign in again.');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });
  let data: ({ error?: string } & T) | null = null;
  try {
    data = (await response.json()) as { error?: string } & T;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(readApiError(data, 'Unable to complete this request. Please try again.'));
  }

  return data as T;
}
