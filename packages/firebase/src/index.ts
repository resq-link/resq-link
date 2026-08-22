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
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
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
  registerCivilian,
  GOV_ID_TYPES,
  getAllDispatchers,
  verifyCommandCenterUser,
  type DispatcherRole,
  type DispatcherAccount,
  type UserAccount,
  type CommandCenterAccount,
  type CivilianUserProfile,
  type CivilianAccountStatus,
  type GovIdType,
  type RegisterCivilianInput,
} from './auth';

// Export emergency report functions
export {
  submitEmergencyReport,
  getUserEmergencyReports,
  getAllEmergencyReports,
  getActiveEmergencyReports,
  subscribeToEmergencyReports,
  type EmergencyReportsSnapshotMeta,
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
  rejectEmergencyReport,
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

export {
  CIVILIAN_TYPE_SPECIFIC_FIELDS,
  DISPATCHER_ADDITIONAL_DETAIL_FIELDS,
  CIVILIAN_NARRATIVE_FIELD_LABELS,
  TYPE_PROFILE_LABELS,
  getCivilianEmergencyTypeLabel,
  mapEmergencyTypeToIncidentCategory,
  mapIncidentCategoryToEmergencyType,
  resolveCivilianNarrativeDisplay,
  resolveFieldAssessmentDisplay,
  getPendingDispatcherFollowUpFields,
  getReportImageUrls,
  type FieldAssessmentEntry,
  type CivilianNarrativeDisplay,
  type CivilianNarrativeField,
  type EmergencyReportFieldAssessmentInput,
} from './civilianFieldAssessment';

export {
  RESPONDER_SCENE_ASSESSMENT_FIELDS,
  getSceneAssessmentFieldDefs,
  getSceneAssessmentEntries,
  hasResponderSceneAssessment,
  parseResponderAssessment,
  submitResponderSceneAssessmentForEmergency,
  submitResponderSceneAssessmentForIncident,
  resolveSceneAssessmentIncidentType,
  type ResponderAssessmentRecord,
  type SceneAssessmentEntry,
  type SceneAssessmentField,
} from './responderAssessment';

export {
  isLiveIncident,
  isLiveEmergencyReport,
  isResolvedIncidentRecord,
  isResolvedEmergencyReport,
  isReportEligibleIncident,
  isResolvedIncidentStatus,
  isResolvedResolutionStatus,
} from './incidentLifecycle';

// Incident prioritization (visual + sound coding, escalation)
export {
  PRIORITY_LEVELS,
  PRIORITY_RANK,
  PRIORITY_VISUAL,
  INCIDENT_TYPE_PRIORITY_MAP,
  ESCALATION_THRESHOLDS_MS,
  MAX_ESCALATION_LEVEL,
  normalizePriority,
  normalizePriorityFromRecord,
  comparePriority,
  sortByPriority,
  isHighPriority,
  requiresForcedAlert,
  requiresAcknowledgmentUI,
  requiresRepeatingAlert,
  resolvePriorityForIncidentType,
  getDefaultPriorityForIncidentType,
  getPriorityBadgeLabel,
  getPriorityMapColor,
  getEscalationPhase,
  getNextEscalationLevel,
  type PriorityVisualTokens,
  type EscalationPhase,
  type AlertAcknowledgmentFields,
} from './priority';

export {
  INCIDENT_STATUS_VISUAL,
  normalizeOperationalStatus,
  getIncidentStatusVisual,
  getIncidentStatusLabel,
  getIncidentStatusColors,
  getIncidentStatusTailwindTextClass,
  getIncidentStatusTailwindDotClass,
  shouldPulseIncidentStatus,
  INCIDENT_STATUS_DOT_PULSE,
  type OperationalIncidentStatus,
  type IncidentStatusVisualToken,
  type StatusColorSet,
} from './incidentStatusVisual';

export {
  acknowledgeEmergencyAlert,
  updateEmergencyPriority,
  applyEmergencyEscalationStep,
  isAlertAcknowledged,
  shouldPlayPriorityAlert,
  type EscalationUpdateResult,
} from './alertAcknowledgment';

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
  ensureDefaultOperationalTeams,
  type TeamRecord,
} from './teams';

export {
  DEFAULT_OPERATIONAL_TEAMS,
  buildAssignedTeamSnapshot,
  getAssignedTeamCode,
  getAssignedTeamId,
  getAssignedTeamName,
  incidentMatchesTeamFilter,
  resolveTeamByCode,
  resolveTeamById,
  resolveTeamFromInput,
  sortTeamsByOrder,
  type AssignedTeamSnapshot,
  type TeamAssignmentHistoryEntry,
} from './operationalTeams';

export {
  setCommandCenterCurrentTeamOnDuty,
  subscribeToCommandCenterCurrentTeamOnDuty,
  currentTeamToAssignmentSnapshot,
  type CurrentTeamOnDutyState,
} from './commandCenterShift';

// Operational messaging
export {
  countUnreadThreads,
  createDirectChat,
  createGroupChat,
  getMessagingParticipants,
  isThreadUnread,
  markThreadRead,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatThreads,
  type ChatMessageRecord,
  type ChatParticipant,
  type ChatParticipantRole,
  type ChatThreadRecord,
  type ChatThreadType,
} from './messaging';

// Incident voice call sessions
export {
  acceptIncidentCallSession,
  buildIncidentCallChannelName,
  declineIncidentCallSession,
  endIncidentCallSession,
  failIncidentCallSession,
  markIncidentCallConnected,
  startIncidentCallSession,
  getIncidentCallSession,
  subscribeToActiveIncidentCallSessions,
  subscribeToIncidentCallSession,
  subscribeToIncidentCallSessions,
  subscribeToResponderIncomingCallSessions,
  type CallRole,
  type CallSessionStatus,
  type IncidentCallSession,
  type StartIncidentCallSessionInput,
} from './callSessions';

// Export incident management functions
export {
  createIncident,
  deleteIncident,
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
  isIncidentResourceSuggested,
  validateIncidentAgencyRouting,
  associateReportsWithIncident,
  disassociateReportFromIncident,
  elevateEmergencyToIncident,
  reassignIncidentTeam,
  incidentAgencyCatalog,
  subscribeToResponderAssignedIncidents,
  acceptIncident,
  declineIncident,
  markIncidentTouchdown,
  submitPostIncidentReportForIncident,
  acknowledgeIncidentAlert,
  hasResponderAcknowledgedAlert,
  updateIncidentCaseStatus,
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

export {
  subscribeToSmsIntakes,
  subscribeToSmsMessages,
  subscribeToSmsQuickReplies,
  createSmsQuickReply,
  deleteSmsQuickReply,
  defaultSmsQuickReplies,
  type SmsIntake,
  type SmsIntakeStatus,
  type SmsMessage,
  type SmsMessageStatus,
  type SmsQuickReply,
  type SmsThread,
} from './sms';



// Responder push notification tokens
export {
  saveResponderPushToken,
  removeResponderPushToken,
} from './pushTokens';
export type { PushPlatform, ResponderPushToken } from './pushTokens';

// Responder duty — which vehicle a responder is crewing
export {
  startResponderDuty,
  endResponderDuty,
  subscribeToResponderDuty,
  updateResourceLocation,
  isPrimaryResponder,
  getResourceCrewIds,
} from "./responderDuty";
export type { ResponderDutyState } from "./responderDuty";