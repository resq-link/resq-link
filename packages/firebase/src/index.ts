// Export Firebase instances
export { auth, firestore, storage } from './config';

// Export Firestore functions
export { getDoc, doc, updateDoc, Timestamp, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';

// Export Firebase Auth types and functions
export type { User } from 'firebase/auth';
export { onAuthStateChanged, signOut } from 'firebase/auth';

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
  assignDispatcherToEmergency,
  subscribeToDispatcherAssignedEmergencies,
  acceptCase,
  updateCaseStatus,
  type EmergencyReport,
} from './emergencies';

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

