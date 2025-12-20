// Export Firebase instances
export { auth, firestore } from './config';

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
  type EmergencyReport,
} from './emergencies';

