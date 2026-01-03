import { ref, uploadBytes, getDownloadURL, UploadResult } from 'firebase/storage';
import { storage } from './config';

/**
 * Convert a file URI to a Blob (works in React Native and Web)
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if we're in React Native environment
    const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    
    if (isReactNative) {
      // For React Native, use XMLHttpRequest which handles file:// URIs properly
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error('Failed to load file'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } else {
      // For web, use fetch
      fetch(uri)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          return response.blob();
        })
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Upload an image file to Firebase Storage
 * @param fileUri - The local file URI (from expo-image-picker or similar)
 * @param path - The storage path (e.g., 'emergencies/photos/')
 * @param fileName - Optional custom file name. If not provided, a timestamp-based name will be generated
 * @returns The download URL of the uploaded file
 */
export async function uploadImageToStorage(
  fileUri: string,
  path: string = 'emergencies/photos/',
  fileName?: string
): Promise<string> {
  try {
    // Generate file name if not provided
    const finalFileName = fileName || `photo_${Date.now()}.jpg`;
    const storagePath = `${path}${finalFileName}`;
    
    // Create a reference to the file location in Storage
    const storageRef = ref(storage, storagePath);
    
    // Convert file URI to blob (handles React Native file:// URIs properly)
    console.log('Converting file URI to blob:', fileUri);
    const blob = await uriToBlob(fileUri);
    console.log('Blob created successfully, size:', blob.size);
    
    // Upload the blob to Firebase Storage
    const uploadResult: UploadResult = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log('✅ Image uploaded to Firebase Storage:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error uploading image to Firebase Storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

