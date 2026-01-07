import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { firestore, auth } from './config';

// Dispatcher location interface
export interface DispatcherLocation {
  dispatcherId: string;
  email: string;
  role: string;
  latitude: number;
  longitude: number;
  lastUpdated: Date | Timestamp;
  isOnline: boolean;
}

// Convert Firestore document to DispatcherLocation
const convertFirestoreDoc = (doc: DocumentData): DispatcherLocation => {
  const data = doc.data();
  return {
    dispatcherId: doc.id,
    email: data.email || '',
    role: data.role || '',
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated || Date.now()),
    isOnline: data.isOnline !== undefined ? data.isOnline : false,
  };
};

/**
 * Update dispatcher location in Firestore
 * @param latitude - Current latitude
 * @param longitude - Current longitude
 * @returns Promise<void>
 */
export async function updateDispatcherLocation(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update location');
    }

    const dispatcherRef = doc(firestore, 'dispatchers', currentUser.uid);
    
    // Get current dispatcher data to preserve email and role
    const dispatcherDoc = await getDoc(dispatcherRef);
    const dispatcherData = dispatcherDoc.exists() ? dispatcherDoc.data() : {};

    await updateDoc(dispatcherRef, {
      latitude,
      longitude,
      lastUpdated: Timestamp.now(),
      isOnline: true,
      email: dispatcherData.email || currentUser.email || '',
      role: dispatcherData.role || '',
    });

    console.log('✅ Dispatcher location updated');
  } catch (error: any) {
    console.error('❌ Error updating dispatcher location:', error.message);
    throw new Error(`Failed to update dispatcher location: ${error.message}`);
  }
}

/**
 * Set dispatcher online status
 * @param isOnline - Whether dispatcher is online
 */
export async function setDispatcherOnlineStatus(isOnline: boolean): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update online status');
    }

    const dispatcherRef = doc(firestore, 'dispatchers', currentUser.uid);
    await updateDoc(dispatcherRef, {
      isOnline,
      lastUpdated: Timestamp.now(),
    });

    console.log(`✅ Dispatcher online status set to: ${isOnline}`);
  } catch (error: any) {
    console.error('❌ Error updating dispatcher online status:', error.message);
    throw new Error(`Failed to update online status: ${error.message}`);
  }
}

/**
 * Subscribe to all active dispatcher locations in real-time
 * @param callback - Callback function that receives array of dispatcher locations
 * @returns Unsubscribe function
 */
export function subscribeToDispatcherLocations(
  callback: (locations: DispatcherLocation[]) => void
): () => void {
  try {
    const dispatchersRef = collection(firestore, 'dispatchers');
    
    // Query for online dispatchers with location data
    const q = query(
      dispatchersRef,
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const locations: DispatcherLocation[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include dispatchers with valid location data
          if (
            data.latitude != null &&
            data.longitude != null &&
            data.latitude !== 0 &&
            data.longitude !== 0
          ) {
            locations.push(convertFirestoreDoc(doc));
          }
        });

        console.log(`📍 Received ${locations.length} dispatcher locations`);
        callback(locations);
      },
      (error) => {
        console.error('❌ Error subscribing to dispatcher locations:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('❌ Error setting up dispatcher location subscription:', error);
    return () => {}; // Return no-op unsubscribe function
  }
}

/**
 * Get all active dispatcher locations (one-time fetch)
 * @returns Promise<DispatcherLocation[]>
 */
export async function getActiveDispatcherLocations(): Promise<DispatcherLocation[]> {
  try {
    const dispatchersRef = collection(firestore, 'dispatchers');
    const q = query(
      dispatchersRef,
      where('isOnline', '==', true)
    );

    const snapshot = await getDocs(q);
    const locations: DispatcherLocation[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.latitude != null &&
        data.longitude != null &&
        data.latitude !== 0 &&
        data.longitude !== 0
      ) {
        locations.push(convertFirestoreDoc(doc));
      }
    });

    return locations;
  } catch (error: any) {
    console.error('❌ Error fetching dispatcher locations:', error);
    throw new Error(`Failed to fetch dispatcher locations: ${error.message}`);
  }
}

