// Export Firebase instances
export { auth, firestore, storage } from './config';

// Export Firestore functions
export { getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

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
  type EmergencyReport,
} from './emergencies';

// Export storage functions
export { uploadImageToStorage } from './storage';

