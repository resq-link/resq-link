import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { firestore, auth } from './config';

// Emergency Report Types
export interface EmergencyReport {
  id?: string;
  userId: string;
  incidentType: 'fire' | 'medical' | 'crime' | 'accident' | 'flood' | 'other';
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  description?: string | null;
  imageUrl?: string | null;
  status: 'pending' | 'active' | 'resolved';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  responder?: string | null;
}

// Convert Firestore document to EmergencyReport
const convertFirestoreDoc = (doc: DocumentData): EmergencyReport => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId || data.user_id || '',
    incidentType: data.incidentType || data.incident_type || 'other',
    locationText: data.locationText || data.location_text || '',
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    description: data.description || null,
    imageUrl: data.imageUrl || data.image_url || null,
    status: data.status || 'pending',
    priority: data.priority || getDefaultPriority(data.incidentType || data.incident_type),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.created_at?.toDate ? data.created_at.toDate() : new Date()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updated_at?.toDate ? data.updated_at.toDate() : null),
    responder: data.responder || null,
  };
};

// Get default priority based on incident type
const getDefaultPriority = (incidentType: string): 'low' | 'medium' | 'high' | 'critical' => {
  switch (incidentType) {
    case 'fire':
      return 'critical';
    case 'medical':
      return 'high';
    case 'crime':
      return 'high';
    case 'accident':
      return 'high';
    case 'flood':
      return 'medium';
    default:
      return 'medium';
  }
};

/**
 * Submit an emergency report to Firestore
 */
export async function submitEmergencyReport(report: Omit<EmergencyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyReport> {
  try {
    // Verify user is authenticated with Firebase Auth
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated with Firebase Auth to submit emergency reports');
    }
    
    // Ensure userId matches the authenticated user
    if (report.userId !== currentUser.uid) {
      console.warn(`UserId mismatch: report.userId (${report.userId}) vs auth.uid (${currentUser.uid}). Using auth.uid.`);
    }
    
    const reportsRef = collection(firestore, 'emergencies');
    
    const reportData = {
      userId: currentUser.uid, // Use authenticated user's UID
      incidentType: report.incidentType,
      locationText: report.locationText,
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description || null,
      imageUrl: report.imageUrl || null,
      status: report.status || 'pending',
      priority: report.priority || getDefaultPriority(report.incidentType),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      responder: report.responder || null,
    };

    const docRef = await addDoc(reportsRef, reportData);
    
    return {
      ...report,
      id: docRef.id,
      userId: currentUser.uid, // Return the actual authenticated user ID
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error: any) {
    console.error('Error submitting emergency report:', error);
    throw new Error(`Failed to submit emergency report: ${error.message}`);
  }
}

/**
 * Get emergency reports for a specific user
 */
export async function getUserEmergencyReports(userId: string, limitCount: number = 50): Promise<EmergencyReport[]> {
  try {
    // Verify user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated with Firebase Auth to fetch emergency reports');
    }
    
    // Use userId from authenticated user if provided userId doesn't match
    const targetUserId = userId || currentUser.uid;
    
    const reportsRef = collection(firestore, 'emergencies');
    
    // Try query with orderBy first, if it fails due to missing index, fall back to simpler query
    try {
      const q = query(
        reportsRef,
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertFirestoreDoc);
    } catch (indexError: any) {
      // If composite index is missing, use simpler query and sort in memory
      if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
        console.warn('Composite index not found, using alternative query method');
        const q = query(
          reportsRef,
          where('userId', '==', targetUserId),
          limit(limitCount * 2) // Get more to account for sorting
        );
        const querySnapshot = await getDocs(q);
        const reports = querySnapshot.docs.map(convertFirestoreDoc);
        // Sort in memory by createdAt descending
        reports.sort((a, b) => {
          const getTime = (date: Date | Timestamp | undefined): number => {
            if (!date) return 0;
            if (date instanceof Date) return date.getTime();
            if (date && typeof date === 'object' && 'toDate' in date) {
              return (date as Timestamp).toDate().getTime();
            }
            return 0;
          };
          const dateA = getTime(a.createdAt);
          const dateB = getTime(b.createdAt);
          return dateB - dateA;
        });
        return reports.slice(0, limitCount);
      }
      throw indexError;
    }
  } catch (error: any) {
    console.error('Error fetching user emergency reports:', error);
    throw new Error(`Failed to fetch emergency reports: ${error.message}`);
  }
}

/**
 * Get all emergency reports (for command center)
 */
export async function getAllEmergencyReports(limitCount: number = 100): Promise<EmergencyReport[]> {
  try {
    const reportsRef = collection(firestore, 'emergencies');
    const q = query(
      reportsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFirestoreDoc);
  } catch (error: any) {
    console.error('Error fetching all emergency reports:', error);
    throw new Error(`Failed to fetch emergency reports: ${error.message}`);
  }
}

/**
 * Get active emergency reports (pending or active status)
 */
export async function getActiveEmergencyReports(limitCount: number = 100): Promise<EmergencyReport[]> {
  try {
    const reportsRef = collection(firestore, 'emergencies');
    const q = query(
      reportsRef,
      where('status', 'in', ['pending', 'active']),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFirestoreDoc);
  } catch (error: any) {
    console.error('Error fetching active emergency reports:', error);
    throw new Error(`Failed to fetch active emergency reports: ${error.message}`);
  }
}

/**
 * Subscribe to real-time updates of all emergency reports
 */
export function subscribeToEmergencyReports(
  callback: (reports: EmergencyReport[]) => void,
  options?: {
    statusFilter?: 'pending' | 'active' | 'resolved' | 'all';
    limitCount?: number;
  }
): () => void {
  try {
    const reportsRef = collection(firestore, 'emergencies');
    
    // Build query constraints - avoid composite indexes by NOT using orderBy in query
    // We'll sort in memory instead to avoid index requirements
    const constraints: QueryConstraint[] = [];
    
    // Use simple equality filter if a single status is specified
    // For 'pending' or 'active', we'll filter in the callback to avoid composite index requirement
    if (options?.statusFilter && options.statusFilter !== 'all') {
      if (options.statusFilter === 'resolved') {
        constraints.push(where('status', '==', 'resolved'));
      }
      // For 'pending' or 'active', we'll filter in callback to avoid 'in' query with orderBy
    }
    
    // Don't use orderBy in query to avoid index requirement - we'll sort in memory
    // This ensures the query works even without a Firestore index
    
    // Apply a higher limit to get more documents for filtering/sorting
    const fetchLimit = options?.limitCount ? options.limitCount * 3 : 300;
    constraints.push(limit(fetchLimit));

    const q = query(reportsRef, ...constraints);

    // Helper function to get timestamp from createdAt
    const getTime = (date: Date | Timestamp | undefined): number => {
      if (!date) return 0;
      if (date instanceof Date) return date.getTime();
      if (date && typeof date === 'object' && 'toDate' in date) {
        return (date as Timestamp).toDate().getTime();
      }
      return 0;
    };

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        console.log(`[subscribeToEmergencyReports] Snapshot received: ${snapshot.docs.length} documents`);
        let reports = snapshot.docs.map(convertFirestoreDoc);
        console.log(`[subscribeToEmergencyReports] Converted ${reports.length} reports`);
        
        // Sort by createdAt descending (newest first) - in memory to avoid index requirement
        reports.sort((a, b) => {
          const timeA = getTime(a.createdAt);
          const timeB = getTime(b.createdAt);
          return timeB - timeA; // Descending order
        });
        
        // Filter by status in callback if needed (avoids composite index requirement)
        if (options?.statusFilter && options.statusFilter !== 'all') {
          if (options.statusFilter === 'pending' || options.statusFilter === 'active') {
            reports = reports.filter(r => r.status === 'pending' || r.status === 'active');
          } else if (options.statusFilter === 'resolved') {
            reports = reports.filter(r => r.status === 'resolved');
          }
        }
        
        // Apply final limit after filtering and sorting
        if (options?.limitCount) {
          reports = reports.slice(0, options.limitCount);
        }
        
        console.log(`[subscribeToEmergencyReports] Calling callback with ${reports.length} reports`);
        callback(reports);
      },
      (error) => {
        console.error('Error in emergency reports subscription:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        // Still call callback with empty array to show loading is done
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up emergency reports subscription:', error);
    console.error('Full error:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Subscribe to real-time updates of active emergency reports (for command center)
 */
export function subscribeToActiveEmergencyReports(
  callback: (reports: EmergencyReport[]) => void,
  limitCount: number = 100
): () => void {
  return subscribeToEmergencyReports(callback, {
    statusFilter: 'all', // Get all, but we'll filter active/pending in the query
    limitCount,
  });
}

