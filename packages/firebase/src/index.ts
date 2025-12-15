// Export Firebase instances
export { auth, firestore } from './config';

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

