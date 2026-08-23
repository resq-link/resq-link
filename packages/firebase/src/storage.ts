import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './config';
import { deleteStorageFile, guessContentType } from './storage.shared';

export { deleteStorageFile } from './storage.shared';

async function uploadViaBlob(
  fileUri: string,
  storageRef: ReturnType<typeof ref>,
  contentType: string
): Promise<string> {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error(`Failed to read image file (${response.status}).`);
  }
  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Selected image file is empty.');
  }
  const uploadResult = await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(uploadResult.ref);
}

/** Upload an image file to Firebase Storage (web / browser). */
export async function uploadImageToStorage(
  fileUri: string,
  path: string = 'emergencies/photos/',
  fileName?: string
): Promise<string> {
  const finalFileName = fileName || `photo_${Date.now()}.jpg`;
  const storagePath = `${path}${finalFileName}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const contentType = guessContentType(fileUri, finalFileName);

  try {
    return await uploadViaBlob(fileUri, storageRef, contentType);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Error uploading image to Firebase Storage:', error);
    throw new Error(`Failed to upload image: ${detail}`);
  }
}
