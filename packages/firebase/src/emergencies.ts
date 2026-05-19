import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  QueryConstraint,
  doc,
  updateDoc,
  onSnapshot as onDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './config';
import type { DispatcherRole } from './auth';

// Emergency Report Types
export interface EmergencyReport {
  id?: string;
  userId: string;
  incidentType:
    | 'fire'
    | 'medical'
    | 'vehicular_accident'
    | 'police_emergency'
    | 'electrical_powerline_hazard'
    | 'other_emergency';
  locationText: string;
  landmark?: string | null;
  peopleInvolved?: number | null;
  latitude: number | null;
  longitude: number | null;
  description?: string | null;
  imageUrl?: string | null;
  incidentId?: string | null; // Associated master incident (if any)
  primaryReportId?: string | null; // Primary report this is grouped under (report-to-report grouping)
  status: 'pending' | 'linked' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved'; // Support both old and new statuses for backward compatibility
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  responder?: string | null;
  assignedResponderId?: string | null;
  assignedAgency?: DispatcherRole | null;
  suggestedAgency?: DispatcherRole | null;
  dispatcherId?: string | null;
  viewedByDispatcherId?: string | null;
  viewedByName?: string | null;
  viewedAt?: Date | Timestamp | null;
  additionalDetailsRequestedAt?: Date | Timestamp | null;
  additionalDetails?: Record<string, string> | null;
  additionalDetailsSubmittedAt?: Date | Timestamp | null;
  declinedByDispatcherId?: string | null;
  declinedByName?: string | null;
  declineReason?: string | null;
  declinedAt?: Date | Timestamp | null;
  touchdownAt?: Date | Timestamp | null;
  touchdownByDispatcherId?: string | null;
  touchdownByName?: string | null;
  touchdownSource?: 'gps' | 'manual' | null;
  touchdownDistanceMeters?: number | null;
  movedToHistoryAt?: Date | Timestamp | null;
  movedToHistoryBy?: string | null;
  postIncidentReport?: {
    reasonForIncident?: string | null;
    notes?: string | null;
    peopleInvolved?: number | null;
    peopleStatus?: string | null;
    hospital?: string | null;
    submittedAt?: Date | Timestamp | null;
    submittedByDispatcherId?: string | null;
    submittedByName?: string | null;
  } | null;
}

// Convert Firestore document to EmergencyReport
export const convertFirestoreDoc = (doc: DocumentData): EmergencyReport => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId || data.user_id || '',
    incidentType: data.incidentType || data.incident_type || 'other_emergency',
    locationText: data.locationText || data.location_text || '',
    landmark: data.landmark || null,
    peopleInvolved:
      typeof data.peopleInvolved === 'number'
        ? data.peopleInvolved
        : typeof data.people_involved === 'number'
        ? data.people_involved
        : null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    description: data.description || null,
    imageUrl: data.imageUrl || data.image_url || null,
    incidentId: data.incidentId || data.incident_id || null,
    primaryReportId: data.primaryReportId || null,
    status: data.status || 'pending',
    priority: data.priority || getDefaultPriority(data.incidentType || data.incident_type),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.created_at?.toDate ? data.created_at.toDate() : new Date()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updated_at?.toDate ? data.updated_at.toDate() : null),
    responder: data.responder || null,
    assignedResponderId: data.assignedResponderId || null,
    assignedAgency: data.assignedAgency || null,
    suggestedAgency: data.suggestedAgency || null,
    dispatcherId: data.dispatcherId || data.dispatcher_id || null,
    viewedByDispatcherId: data.viewedByDispatcherId || data.viewed_by_dispatcher_id || null,
    viewedByName: data.viewedByName || data.viewed_by_name || null,
    viewedAt: data.viewedAt?.toDate ? data.viewedAt.toDate() : (data.viewed_at?.toDate ? data.viewed_at.toDate() : null),
    additionalDetailsRequestedAt: data.additionalDetailsRequestedAt?.toDate
      ? data.additionalDetailsRequestedAt.toDate()
      : null,
    additionalDetails:
      data.additionalDetails && typeof data.additionalDetails === 'object'
        ? Object.entries(data.additionalDetails).reduce<Record<string, string>>((acc, [key, value]) => {
            if (typeof value === 'string') {
              acc[key] = value;
            }
            return acc;
          }, {})
        : null,
    additionalDetailsSubmittedAt: data.additionalDetailsSubmittedAt?.toDate
      ? data.additionalDetailsSubmittedAt.toDate()
      : null,
    declinedByDispatcherId: data.declinedByDispatcherId || null,
    declinedByName: data.declinedByName || null,
    declineReason: data.declineReason || null,
    declinedAt: data.declinedAt?.toDate ? data.declinedAt.toDate() : null,
    touchdownAt: data.touchdownAt?.toDate ? data.touchdownAt.toDate() : null,
    touchdownByDispatcherId: data.touchdownByDispatcherId || null,
    touchdownByName: data.touchdownByName || null,
    touchdownSource: data.touchdownSource || null,
    touchdownDistanceMeters:
      typeof data.touchdownDistanceMeters === 'number'
        ? data.touchdownDistanceMeters
        : null,
    movedToHistoryAt: data.movedToHistoryAt?.toDate ? data.movedToHistoryAt.toDate() : null,
    movedToHistoryBy: data.movedToHistoryBy || null,
    postIncidentReport:
      data.postIncidentReport && typeof data.postIncidentReport === 'object'
        ? {
            reasonForIncident: data.postIncidentReport.reasonForIncident || null,
            notes: data.postIncidentReport.notes || null,
            peopleInvolved:
              typeof data.postIncidentReport.peopleInvolved === 'number'
                ? data.postIncidentReport.peopleInvolved
                : null,
            peopleStatus: data.postIncidentReport.peopleStatus || null,
            hospital: data.postIncidentReport.hospital || null,
            submittedAt: data.postIncidentReport.submittedAt?.toDate
              ? data.postIncidentReport.submittedAt.toDate()
              : null,
            submittedByDispatcherId: data.postIncidentReport.submittedByDispatcherId || null,
            submittedByName: data.postIncidentReport.submittedByName || null,
          }
        : null,
  };
};

// Get default priority based on incident type
const getDefaultPriority = (incidentType: string): 'low' | 'medium' | 'high' | 'critical' => {
  switch (incidentType) {
    case 'fire':
      return 'critical';
    case 'medical':
      return 'high';
    case 'police_emergency':
      return 'high';
    case 'vehicular_accident':
      return 'high';
    case 'electrical_powerline_hazard':
      return 'high';
    case 'other_emergency':
      return 'medium';
    default:
      return 'medium';
  }
};

export function getSuggestedAgenciesForEmergencyType(
  incidentType: EmergencyReport['incidentType']
): DispatcherRole[] {
  switch (incidentType) {
    case 'fire':
      return ['BFP'];
    case 'medical':
      return ['AMBULANCE'];
    case 'vehicular_accident':
      return ['MDRRMO', 'PNP'];
    case 'police_emergency':
      return ['PNP'];
    case 'electrical_powerline_hazard':
      return ['MDRRMO'];
    case 'other_emergency':
    default:
      return [];
  }
}

/**
 * Submit an emergency report to Firestore
 */
export async function submitEmergencyReport(report: Omit<EmergencyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyReport> {
  try {
    // Verify user is authenticated with Firebase Auth
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated with Firebase Auth to submit emergency reports');
    }
    
    // Ensure userId matches the authenticated user
    if (report.userId !== currentUser.uid) {
      console.warn(`UserId mismatch: report.userId (${report.userId}) vs auth.uid (${currentUser.uid}). Using auth.uid.`);
    }
    
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
    
    const reportData = {
      userId: currentUser.uid, // Use authenticated user's UID
      incidentType: report.incidentType,
      locationText: report.locationText,
      landmark: report.landmark || null,
      peopleInvolved: report.peopleInvolved ?? null,
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description || null,
      imageUrl: report.imageUrl || null,
      incidentId: report.incidentId || null,
      status: report.status || 'pending',
      priority: report.priority || getDefaultPriority(report.incidentType),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      responder: report.responder || null,
      assignedResponderId: report.assignedResponderId || null,
      assignedAgency: report.assignedAgency || null,
      suggestedAgency: report.suggestedAgency || null,
      dispatcherId: report.dispatcherId || null,
      viewedByDispatcherId: report.viewedByDispatcherId || null,
      viewedByName: report.viewedByName || null,
      viewedAt: report.viewedAt || null,
      additionalDetailsRequestedAt: report.additionalDetailsRequestedAt || null,
      additionalDetails: report.additionalDetails || null,
      additionalDetailsSubmittedAt: report.additionalDetailsSubmittedAt || null,
      declinedByDispatcherId: report.declinedByDispatcherId || null,
      declinedByName: report.declinedByName || null,
      declineReason: report.declineReason || null,
      declinedAt: report.declinedAt || null,
      touchdownAt: report.touchdownAt || null,
      touchdownByDispatcherId: report.touchdownByDispatcherId || null,
      touchdownByName: report.touchdownByName || null,
      touchdownSource: report.touchdownSource || null,
      touchdownDistanceMeters: report.touchdownDistanceMeters ?? null,
      movedToHistoryAt: report.movedToHistoryAt || null,
      movedToHistoryBy: report.movedToHistoryBy || null,
      postIncidentReport: report.postIncidentReport || null,
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
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated with Firebase Auth to fetch emergency reports');
    }
    
    // Use userId from authenticated user if provided userId doesn't match
    const targetUserId = userId || currentUser.uid;
    
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
    
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
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
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
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
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
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
    
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

/**
 * Assign a dispatcher to an emergency report
 * @param reportId - Emergency report ID
 * @param dispatcherId - Dispatcher user ID (null to unassign)
 * @returns Updated emergency report
 */
export async function assignDispatcherToEmergency(
  reportId: string,
  dispatcherId: string | null
): Promise<EmergencyReport> {
  try {
    // Verify user is authenticated
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to assign dispatchers');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    
    // Get the current document to preserve existing data
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }
    
    const currentData = reportDocSnap.data();
    
    // Update the report with dispatcher assignment
    const updateData: any = {
      dispatcherId: dispatcherId || null,
      updatedAt: Timestamp.now(),
    };
    
    // Only change status to active if assigning (not unassigning)
    if (dispatcherId) {
      updateData.status = currentData.status === 'resolved' ? 'resolved' : 'active';
    }
    
    await updateDoc(reportRef, updateData);

    // Propagate dispatcher and status updates to all secondary (grouped) reports
    await propagateUpdatesToSecondaries(reportId, {
      dispatcherId: dispatcherId || null,
      status: updateData.status || currentData.status || 'pending',
    });

    // Fetch and return the updated report
    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }
    
    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error assigning dispatcher to emergency:', error);
    throw new Error(`Failed to assign dispatcher: ${error.message}`);
  }
}

export function subscribeToEmergencyReport(
  reportId: string,
  callback: (report: EmergencyReport | null) => void
): () => void {
  try {
    if (!reportId) {
      callback(null);
      return () => {};
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    return onDocumentSnapshot(
      reportRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback(convertFirestoreDoc(snapshot));
      },
      (error) => {
        console.error('Error subscribing to emergency report:', error);
        callback(null);
      }
    );
  } catch (error) {
    console.error('Error setting up emergency report subscription:', error);
    callback(null);
    return () => {};
  }
}

export async function assignResponderToEmergency(
  reportId: string,
  assignment: {
    responder: string | null;
    assignedResponderId?: string | null;
    assignedAgency?: DispatcherRole | null;
    suggestedAgency?: DispatcherRole | null;
  }
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to assign responders');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    await updateDoc(reportRef, {
      responder: assignment.responder?.trim() || null,
      assignedResponderId: assignment.assignedResponderId || null,
      assignedAgency: assignment.assignedAgency || null,
      suggestedAgency: assignment.suggestedAgency || null,
      declinedByDispatcherId: null,
      declinedByName: null,
      declineReason: null,
      declinedAt: null,
      updatedAt: Timestamp.now(),
    });

    // Propagate responder assignments to all secondary (grouped) reports
    await propagateUpdatesToSecondaries(reportId, {
      responder: assignment.responder?.trim() || null,
      assignedResponderId: assignment.assignedResponderId || null,
      assignedAgency: assignment.assignedAgency || null,
      suggestedAgency: assignment.suggestedAgency || null,
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error assigning responder to emergency:', error);
    throw new Error(`Failed to assign responder: ${error.message}`);
  }
}

export async function requestEmergencyAdditionalDetails(
  reportId: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to request additional details');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    await updateDoc(reportRef, {
      status: 'active',
      additionalDetailsRequestedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error requesting emergency additional details:', error);
    throw new Error(`Failed to request additional details: ${error.message}`);
  }
}

export async function markEmergencyReportViewed(
  reportId: string,
  dispatcherName: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to view emergency reports');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    await updateDoc(reportRef, {
      viewedByDispatcherId: currentUser.uid,
      viewedByName: dispatcherName.trim() || currentUser.email || currentUser.uid,
      viewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error marking emergency report as viewed:', error);
    throw new Error(`Failed to mark report as viewed: ${error.message}`);
  }
}

export async function submitEmergencyAdditionalDetails(
  reportId: string,
  details: Record<string, string>
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to submit additional details');
    }

    const normalizedDetails = Object.entries(details).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalizedKey = key.trim();
        const normalizedValue = value.trim();
        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue;
        }
        return acc;
      },
      {}
    );

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    await updateDoc(reportRef, {
      additionalDetails:
        Object.keys(normalizedDetails).length > 0 ? normalizedDetails : null,
      additionalDetailsSubmittedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error submitting emergency additional details:', error);
    throw new Error(`Failed to submit additional details: ${error.message}`);
  }
}

/**
 * Accept a case (update status from pending to enroute)
 * Only the assigned dispatcher can accept their assigned case
 * @param reportId - Emergency report ID
 * @returns Updated emergency report
 */
export async function acceptCase(reportId: string): Promise<EmergencyReport> {
  try {
    // Verify user is authenticated
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to accept cases');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    
    // Get the current document to verify assignment
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }
    
    const currentData = reportDocSnap.data();
    const currentDispatcherId = currentData.dispatcherId || currentData.dispatcher_id;
    
    // Verify the dispatcher is assigned to this case
    if (currentDispatcherId !== currentUser.uid) {
      throw new Error('Only the assigned dispatcher can accept this case');
    }
    
    // Verify the case is in pending or active status
    const currentStatus = currentData.status || 'pending';
    if (currentStatus !== 'pending' && currentStatus !== 'active') {
      throw new Error('Case can only be accepted when status is pending or active');
    }
    
    // Update the report status to enroute
    await updateDoc(reportRef, {
      status: 'enroute',
      updatedAt: Timestamp.now(),
    });

    // Propagate status change to all secondary (grouped) reports
    await propagateUpdatesToSecondaries(reportId, {
      status: 'enroute',
    });

    // Fetch and return the updated report
    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }
    
    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error accepting case:', error);
    throw new Error(`Failed to accept case: ${error.message}`);
  }
}

export async function declineCase(
  reportId: string,
  reason: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to decline cases');
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new Error('Decline reason is required');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    const currentData = reportDocSnap.data();
    const currentDispatcherId = currentData.dispatcherId || currentData.dispatcher_id;
    if (currentDispatcherId !== currentUser.uid) {
      throw new Error('Only the assigned dispatcher can decline this case');
    }

    const currentStatus = currentData.status || 'pending';
    if (!['pending', 'active'].includes(currentStatus)) {
      throw new Error('Case can only be declined before it is accepted');
    }

    await updateDoc(reportRef, {
      status: 'active',
      dispatcherId: null,
      responder: null,
      assignedResponderId: null,
      assignedAgency: null,
      declinedByDispatcherId: currentUser.uid,
      declinedByName: currentUser.displayName || currentUser.email || currentUser.uid,
      declineReason: normalizedReason,
      declinedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error declining case:', error);
    throw new Error(`Failed to decline case: ${error.message}`);
  }
}

export async function markCaseTouchdown(
  reportId: string,
  options: {
    source: 'gps' | 'manual';
    distanceMeters?: number | null;
  }
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to mark touchdown');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    const currentData = reportDocSnap.data();
    const currentDispatcherId = currentData.dispatcherId || currentData.dispatcher_id;
    if (currentDispatcherId !== currentUser.uid) {
      throw new Error('Only the assigned dispatcher can mark touchdown for this case');
    }

    const currentStatus = currentData.status || 'pending';
    if (currentStatus === 'done' || currentStatus === 'resolved') {
      throw new Error('Cannot mark touchdown after the case is completed');
    }

    const updateData: Record<string, unknown> = {
      touchdownAt: currentData.touchdownAt || Timestamp.now(),
      touchdownByDispatcherId: currentUser.uid,
      touchdownByName: currentUser.displayName || currentUser.email || currentUser.uid,
      touchdownSource: options.source,
      touchdownDistanceMeters:
        typeof options.distanceMeters === 'number' ? options.distanceMeters : null,
      updatedAt: Timestamp.now(),
    };

    if (currentStatus !== 'on_scene') {
      updateData.status = 'on_scene';
    }

    await updateDoc(reportRef, updateData);

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error marking case touchdown:', error);
    throw new Error(`Failed to mark touchdown: ${error.message}`);
  }
}

export async function submitPostIncidentReport(
  reportId: string,
  postReport: {
    reasonForIncident?: string | null;
    notes?: string | null;
    peopleInvolved?: number | null;
    peopleStatus?: string | null;
    hospital?: string | null;
  }
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to submit a post report');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    const currentData = reportDocSnap.data();
    const currentDispatcherId = currentData.dispatcherId || currentData.dispatcher_id;
    if (currentDispatcherId !== currentUser.uid) {
      throw new Error('Only the assigned dispatcher can submit a post report');
    }

    await updateDoc(reportRef, {
      postIncidentReport: {
        reasonForIncident: postReport.reasonForIncident?.trim() || null,
        notes: postReport.notes?.trim() || null,
        peopleInvolved:
          typeof postReport.peopleInvolved === 'number'
            ? postReport.peopleInvolved
            : null,
        peopleStatus: postReport.peopleStatus?.trim() || null,
        hospital: postReport.hospital?.trim() || null,
        submittedAt: Timestamp.now(),
        submittedByDispatcherId: currentUser.uid,
        submittedByName: currentUser.displayName || currentUser.email || currentUser.uid,
      },
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error submitting post incident report:', error);
    throw new Error(`Failed to submit post report: ${error.message}`);
  }
}

export async function moveEmergencyReportToHistory(
  reportId: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to move reports to history');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }

    const currentData = reportDocSnap.data();
    if (!currentData.touchdownAt) {
      throw new Error('Report can only be moved to history after touchdown');
    }

    await updateDoc(reportRef, {
      status: 'resolved',
      movedToHistoryAt: Timestamp.now(),
      movedToHistoryBy: currentUser.uid,
      updatedAt: Timestamp.now(),
    });

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error moving emergency report to history:', error);
    throw new Error(`Failed to move report to history: ${error.message}`);
  }
}

/**
 * Update case status (enroute, on_scene, or done)
 * Only the assigned dispatcher can update their assigned case
 * @param reportId - Emergency report ID
 * @param newStatus - New status (enroute, on_scene, or done)
 * @returns Updated emergency report
 */
export async function updateCaseStatus(
  reportId: string,
  newStatus: 'enroute' | 'on_scene' | 'done'
): Promise<EmergencyReport> {
  try {
    // Verify user is authenticated
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update case status');
    }

    // Validate status
    if (!['enroute', 'on_scene', 'done'].includes(newStatus)) {
      throw new Error('Invalid status. Must be enroute, on_scene, or done');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    
    // Get the current document to verify assignment
    const reportDocSnap = await getDoc(reportRef);
    if (!reportDocSnap.exists()) {
      throw new Error('Emergency report not found');
    }
    
    const currentData = reportDocSnap.data();
    const currentDispatcherId = currentData.dispatcherId || currentData.dispatcher_id;
    const currentStatus = currentData.status || 'pending';
    
    // Verify the dispatcher is assigned to this case
    if (currentDispatcherId !== currentUser.uid) {
      throw new Error('Only the assigned dispatcher can update this case');
    }
    
    // Prevent updating if already done
    if (currentStatus === 'done') {
      throw new Error('Cannot update case status once it is marked as done');
    }
    
    // Update the report status
    await updateDoc(reportRef, {
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // Propagate status change to all secondary (grouped) reports
    await propagateUpdatesToSecondaries(reportId, {
      status: newStatus,
    });

    // Fetch and return the updated report
    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }
    
    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error updating case status:', error);
    throw new Error(`Failed to update case status: ${error.message}`);
  }
}

/**
 * Subscribe to real-time updates of emergency reports assigned to a specific dispatcher
 * @param dispatcherId - Dispatcher user ID
 * @param callback - Callback function to receive reports
 * @param options - Optional filter and limit options
 * @returns Unsubscribe function
 */
export function subscribeToDispatcherAssignedEmergencies(
  dispatcherId: string,
  callback: (reports: EmergencyReport[]) => void,
  options?: {
    statusFilter?: 'pending' | 'active' | 'resolved' | 'all';
    limitCount?: number;
  }
): () => void {
  try {
    const reportsRef = collection(getFirebaseFirestore(), 'emergencies');
    
    // Build query to get emergencies assigned to this dispatcher
    const constraints: QueryConstraint[] = [
      where('dispatcherId', '==', dispatcherId),
    ];
    
    // Apply status filter if specified
    if (options?.statusFilter && options.statusFilter !== 'all') {
      constraints.push(where('status', '==', options.statusFilter));
    }
    
    // Apply limit
    const fetchLimit = options?.limitCount || 100;
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
        console.log(`[subscribeToDispatcherAssignedEmergencies] Snapshot received: ${snapshot.docs.length} documents for dispatcher ${dispatcherId}`);
        let reports = snapshot.docs.map(convertFirestoreDoc);
        
        // Sort by createdAt descending (newest first)
        reports.sort((a, b) => {
          const timeA = getTime(a.createdAt);
          const timeB = getTime(b.createdAt);
          return timeB - timeA; // Descending order
        });
        
        console.log(`[subscribeToDispatcherAssignedEmergencies] Calling callback with ${reports.length} reports`);
        callback(reports);
      },
      (error) => {
        console.error('Error in dispatcher assigned emergencies subscription:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        // Still call callback with empty array to show loading is done
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error setting up dispatcher assigned emergencies subscription:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Link an emergency report to a master incident
 * @param reportId - The ID of the emergency report
 * @param incidentId - The ID of the master incident (null to unlink)
 * @returns Updated emergency report
 */
export async function linkEmergencyToIncident(
  reportId: string,
  incidentId: string | null
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to link reports to incidents');
    }

    const reportRef = doc(getFirebaseFirestore(), 'emergencies', reportId);
    
    // Update report
    const updateData: any = {
      incidentId: incidentId || null,
      updatedAt: Timestamp.now(),
    };
    
    if (incidentId) {
      updateData.status = 'linked';
    } else {
      updateData.status = 'pending';
    }

    await updateDoc(reportRef, updateData);

    const updatedDocSnap = await getDoc(reportRef);
    if (!updatedDocSnap.exists()) {
      throw new Error('Emergency report not found after update');
    }

    return convertFirestoreDoc(updatedDocSnap);
  } catch (error: any) {
    console.error('Error linking emergency to incident:', error);
    throw new Error(`Failed to link emergency to incident: ${error.message}`);
  }
}

/**
 * Propagate updates to all secondary (duplicate) reports that are linked to this primary report.
 */
async function propagateUpdatesToSecondaries(primaryReportId: string, updates: any) {
  try {
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, 'emergencies'),
      where('primaryReportId', '==', primaryReportId)
    );
    const querySnapshot = await getDocs(q);
    
    const updatePromises = querySnapshot.docs.map((docSnap) => {
      const secondaryRef = doc(db, 'emergencies', docSnap.id);
      return updateDoc(secondaryRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error(`Error propagating updates from primary ${primaryReportId} to secondaries:`, error);
  }
}


/**
 * Link a secondary (duplicate) civilian report to a primary report.
 * The secondary will copy the primary's current status so they stay in sync.
 */
export async function linkReportToReport(
  primaryReportId: string,
  secondaryReportId: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to link reports');
    }

    const db = getFirebaseFirestore();

    // Fetch primary report to copy its current status
    const primaryRef = doc(db, 'emergencies', primaryReportId);
    const primarySnap = await getDoc(primaryRef);
    if (!primarySnap.exists()) {
      throw new Error('Primary report not found');
    }
    const primaryData = primarySnap.data();
    const inheritedStatus = primaryData.status || 'pending';
    const inheritedResponderId = primaryData.assignedResponderId || null;
    const inheritedResponder = primaryData.responder || null;
    const inheritedAgency = primaryData.assignedAgency || null;

    // Update secondary report to point to primary and inherit status
    const secondaryRef = doc(db, 'emergencies', secondaryReportId);
    await updateDoc(secondaryRef, {
      primaryReportId,
      status: inheritedStatus,
      assignedResponderId: inheritedResponderId,
      responder: inheritedResponder,
      assignedAgency: inheritedAgency,
      updatedAt: Timestamp.now(),
    });

    const updatedSnap = await getDoc(secondaryRef);
    if (!updatedSnap.exists()) {
      throw new Error('Secondary report not found after update');
    }
    return convertFirestoreDoc(updatedSnap);
  } catch (error: any) {
    console.error('Error linking reports:', error);
    throw new Error(`Failed to link reports: ${error.message}`);
  }
}

/**
 * Unlink a secondary report from its primary, resetting it to pending.
 */
export async function unlinkReportFromReport(
  secondaryReportId: string
): Promise<EmergencyReport> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to unlink reports');
    }

    const secondaryRef = doc(getFirebaseFirestore(), 'emergencies', secondaryReportId);
    await updateDoc(secondaryRef, {
      primaryReportId: null,
      status: 'pending',
      assignedResponderId: null,
      responder: null,
      assignedAgency: null,
      updatedAt: Timestamp.now(),
    });

    const updatedSnap = await getDoc(secondaryRef);
    if (!updatedSnap.exists()) {
      throw new Error('Report not found after unlink');
    }
    return convertFirestoreDoc(updatedSnap);
  } catch (error: any) {
    console.error('Error unlinking report:', error);
    throw new Error(`Failed to unlink report: ${error.message}`);
  }
}

