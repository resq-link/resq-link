/**
 * Thin entry for civilian mobile auth flows — imports only ./auth + ./config.
 * Does not pull emergencies, incidents, resources, etc. (avoids heavy graph on login/register).
 */
export { signInCivilian } from './auth';
export type { CivilianUserProfile } from './auth';
export {
  signInUserWithPhone,
  verifyPhoneCode,
  verifyPhoneCodeAndCreateProfile,
  createOrUpdateUserProfile,
} from './auth';
