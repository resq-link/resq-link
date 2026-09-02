/**
 * Thin entry for civilian mobile auth flows — imports only ./auth + ./config.
 * Does not pull emergencies, incidents, resources, etc. (avoids heavy graph on login/register).
 */
export { signInCivilian, registerCivilian, deleteCivilianAccount, GOV_ID_TYPES } from './auth';
export type {
  CivilianUserProfile,
  CivilianAccountStatus,
  GovIdType,
  RegisterCivilianInput,
} from './auth';
export {
  signInUserWithPhone,
  verifyPhoneCode,
  verifyPhoneCodeAndCreateProfile,
  createOrUpdateUserProfile,
} from './auth';
