import { ref, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from './config';

export function guessContentType(uri: string, fileName?: string): string {
  const sources = [fileName || '', uri.split('?')[0] || ''];
  for (const source of sources) {
    const lower = source.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  }
  return 'image/jpeg';
}

/** Best-effort delete used during registration rollback. */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(getFirebaseStorage(), storagePath));
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code || '')
        : '';
    if (code.includes('object-not-found')) {
      return;
    }
    console.warn('Failed to delete storage file during rollback:', storagePath, error);
  }
}
