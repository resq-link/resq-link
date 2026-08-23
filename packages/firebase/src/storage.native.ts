import { ref, getDownloadURL } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseStorage } from './config';
import { deleteStorageFile, guessContentType } from './storage.shared';

export { deleteStorageFile } from './storage.shared';

type ExpoLegacyFileSystem = {
  uploadAsync: (
    url: string,
    fileUri: string,
    options?: {
      httpMethod?: string;
      uploadType?: number;
      headers?: Record<string, string>;
    }
  ) => Promise<{ status: number; body: string }>;
  FileSystemUploadType?: {
    BINARY_CONTENT: number;
  };
};

function loadExpoLegacyFileSystem(): ExpoLegacyFileSystem {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-file-system/legacy') as ExpoLegacyFileSystem;
}

function getStorageBucketName(): string {
  const storage = getFirebaseStorage();
  const bucket = storage.app.options.storageBucket;
  if (!bucket) {
    throw new Error('Firebase Storage bucket is not configured.');
  }
  return bucket;
}

function buildStorageDownloadUrl(bucket: string, objectName: string, downloadToken: string): string {
  const encodedName = encodeURIComponent(objectName);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media&token=${downloadToken}`;
}

/**
 * React Native upload via Firebase Storage REST + expo-file-system.
 * Avoids firebase/storage Blob/ArrayBuffer paths that break on RN BlobManager.
 */
async function uploadViaRestApi(
  fileUri: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to upload images.');
  }

  const idToken = await user.getIdToken();
  const bucket = getStorageBucketName();
  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  const FileSystem = loadExpoLegacyFileSystem();
  const uploadType = FileSystem.FileSystemUploadType?.BINARY_CONTENT ?? 0;

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType,
    headers: {
      Authorization: `Firebase ${idToken}`,
      'Content-Type': contentType,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    const snippet = String(result.body || '').slice(0, 240);
    throw new Error(
      `Storage upload failed (${result.status}) for ${storagePath}${snippet ? `: ${snippet}` : ''}`
    );
  }

  let payload: { name?: string; downloadTokens?: string };
  try {
    payload = JSON.parse(result.body) as { name?: string; downloadTokens?: string };
  } catch {
    throw new Error('Storage upload returned an invalid response.');
  }

  const objectName = payload.name || storagePath;
  const downloadToken = payload.downloadTokens;
  if (downloadToken) {
    return buildStorageDownloadUrl(bucket, objectName, downloadToken);
  }

  return getDownloadURL(ref(getFirebaseStorage(), storagePath));
}

/** Upload an image file to Firebase Storage (React Native / Expo). */
export async function uploadImageToStorage(
  fileUri: string,
  path: string = 'emergencies/photos/',
  fileName?: string
): Promise<string> {
  const finalFileName = fileName || `photo_${Date.now()}.jpg`;
  const storagePath = `${path}${finalFileName}`;
  const contentType = guessContentType(fileUri, finalFileName);

  try {
    return await uploadViaRestApi(fileUri, storagePath, contentType);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Error uploading image to Firebase Storage:', error);
    throw new Error(`Failed to upload image: ${detail}`);
  }
}
