// Lazy accessors — no Firebase SDK init until first call (use these instead of legacy `auth` / `firestore` exports).
export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
  getFirebaseRealtimeDatabase,
  isFirebaseRealtimeDatabaseConfigured,
} from './config';

// Export Firestore functions
export { getDoc, doc, updateDoc, Timestamp, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';

// Export Firebase Auth types and functions
export type { User } from 'firebase/auth';
export {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';

// Export authentication functions
export {
  createDispatcherAccount,
  createCommandCenterAccount,
  signInUserWithPhone,
  verifyPhoneCode,
  createOrUpdateUserProfile,
  verifyPhoneCodeAndCreateProfile,
  signInDispatcher,
  signInCommandCenter,
  signInCivilian,
  getAllDispatchers,
  verifyCommandCenterUser,
  type DispatcherRole,
  type DispatcherAccount,
  type UserAccount,
  type CommandCenterAccount,
  type CivilianUserProfile,
} from './auth';

// Export emergency report functions
export {
  submitEmergencyReport,
  getUserEmergencyReports,
  getAllEmergencyReports,
  getActiveEmergencyReports,
  subscribeToEmergencyReports,
  subscribeToActiveEmergencyReports,
  subscribeToEmergencyReport,
  assignDispatcherToEmergency,
  assignResponderToEmergency,
  requestEmergencyAdditionalDetails,
  markEmergencyReportViewed,
  submitEmergencyAdditionalDetails,
  subscribeToDispatcherAssignedEmergencies,
  acceptCase,
  declineCase,
  markCaseTouchdown,
  moveEmergencyReportToHistory,
  submitPostIncidentReport,
  updateCaseStatus,
  linkEmergencyToIncident,
  linkReportToReport,
  unlinkReportFromReport,
  convertFirestoreDoc,
  type EmergencyReport,
} from './emergencies';

export { getSuggestedAgenciesForEmergencyType } from './emergencies';

// Footage requests (CCTV / evidence)
export {
  submitFootageRequest,
  getUserFootageRequests,
  subscribeToUserFootageRequests,
  subscribeToFootageRequests,
  updateFootageRequestStatus,
  FOOTAGE_PURPOSE_KEYS,
  FOOTAGE_PURPOSE_LABELS,
  type FootageRequest,
  type FootageRequestPurpose,
  type FootageRequestStatus,
  type SubmitFootageRequestInput,
} from './footageRequests';

// Export storage functions
export { uploadImageToStorage } from './storage';

// Export dispatcher location functions
export {
  updateDispatcherLocation,
  setDispatcherOnlineStatus,
  subscribeToDispatcherLocations,
  getActiveDispatcherLocations,
  type DispatcherLocation,
} from './dispatchers';

// Responder presence (Realtime DB) + live online count
export {
  subscribeToOnlineResponderCount,
  beginResponderRealtimePresence,
  suspendResponderRealtimePresence,
  resumeResponderRealtimePresence,
  clearResponderRealtimePresence,
  isResponderDesignation,
} from './responderPresence';

// Export resource management functions
export {
  createResource,
  updateResource,
  deleteResource,
  getAllResources,
  subscribeToResources,
  type ResourceRecord,
  type ResourceStatus,
  type ResourceType,
} from './resources';

// Export shared quadrant definitions
export {
  OPERATIONAL_QUADRANTS,
  MAP_QUADRANTS,
  QUADRANT_LABELS,
  QUADRANT_COLORS,
  BARANGAY_QUADRANT_MAPPING,
  normalizeQuadrant,
  type OperationalQuadrant,
  type MapQuadrant,
} from './quadrants';

// Export team management functions
export {
  createTeam,
  updateTeam,
  deleteTeam,
  getAllTeams,
  subscribeToTeams,
  type TeamRecord,
} from './teams';

// Export incident management functions
export {
  createIncident,
  dispatchIncidentResources,
  saveIncidentTypeRule,
  fetchIncidentTypeRules,
  subscribeToIncidents,
  subscribeToIncidentTypeRules,
  getIncidentTypeRules,
  getIncidentTypeRuleById,
  resolveIncidentTypeRuleById,
  getAgencyLabel,
  getExpectedResourceTypesForAgencies,
  formatIncidentStatus,
  getIncidentPriorityTone,
  getIncidentResourceMatch,
  validateIncidentAgencyRouting,
  associateReportsWithIncident,
  disassociateReportFromIncident,
  elevateEmergencyToIncident,
  incidentAgencyCatalog,
  type AgencyCode,
  type CreateIncidentInput,
  type IncidentCategory,
  type IncidentDispatchRecord,
  type IncidentPriority,
  type IncidentRecord,
  type IncidentSource,
  type IncidentStatus,
  type IncidentTypeRule,
  type TeamOnDuty,
  type ResolutionStatus,
  type ScheduleOfDuty,
  type SaveIncidentTypeRuleInput,
} from './incidents';

