import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  User,
  PhoneAuthProvider,
  signInWithCredential,
  ConfirmationResult,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { firebaseInfo } from './logger';
import { deleteStorageFile, uploadImageToStorage } from './storage';

// Dispatcher roles
export type DispatcherRole = 'BFP' | 'PNP' | 'MDRRMO' | 'AMBULANCE' | 'PCG';

// Dispatcher account interface
export interface DispatcherAccount {
  fullName?: string;
  email: string;
  role: DispatcherRole;
  designation?: string | null;
  teamCode?: string | null;
  teamLabel?: string | null;
  createdAt: any;
  active: boolean;
}

// User account interface
export interface UserAccount {
  phone: string;
  fullName: string;
  address: string;
  createdAt: any;
}

// Command Center account interface
export interface CommandCenterAccount {
  email: string;
  name: string;
  location: string;
  createdAt: any;
}

/**
 * Create a dispatcher account with email and password
 * @param email - Email address
 * @param password - Password
 * @param role - Dispatcher role (BFP, PNP, MDRRMO, AMBULANCE, PCG)
 * @returns User object and account data
 */
export async function createDispatcherAccount(
  email: string,
  password: string,
  role: DispatcherRole
): Promise<{ user: User; accountData: DispatcherAccount }> {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    const user = userCredential.user;

    // Create profile in Firestore
    const accountData: DispatcherAccount = {
      fullName: '',
      email,
      role,
      designation: 'dispatcher',
      teamCode: null,
      teamLabel: null,
      createdAt: serverTimestamp(),
      active: true,
    };

    await setDoc(doc(getFirebaseFirestore(), 'dispatchers', user.uid), accountData);

    return { user, accountData };
  } catch (error: any) {
    throw new Error(`Failed to create dispatcher account: ${error.message}`);
  }
}

/**
 * Sign in user with phone number
 * This function initiates phone authentication
 * @param phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param recaptchaContainerId - Optional container ID for reCAPTCHA (web only). Defaults to 'recaptcha-container'
 * @returns Confirmation result object with confirm method to verify code
 */
export async function signInUserWithPhone(
  phoneNumber: string,
  recaptchaContainerId: string = 'recaptcha-container'
): Promise<ConfirmationResult> {
  try {
    // For web environments, we need RecaptchaVerifier
    // For React Native/Expo, this will need to be handled differently
    let recaptchaVerifier: RecaptchaVerifier | null = null;

    if (typeof window !== 'undefined') {
      // Web environment - create reCAPTCHA verifier
      const container = document.getElementById(recaptchaContainerId);
      if (!container) {
        throw new Error(`reCAPTCHA container with id "${recaptchaContainerId}" not found. Add a div with this id to your HTML.`);
      }

      recaptchaVerifier = new RecaptchaVerifier(getFirebaseAuth(), recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber
        },
      });
    }

    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(
      getFirebaseAuth(),
      phoneNumber,
      recaptchaVerifier as any
    );

    return confirmationResult;
  } catch (error: any) {
    throw new Error(`Failed to sign in with phone: ${error.message}`);
  }
}

/**
 * Verify phone number code using ConfirmationResult
 * @param confirmationResult - Confirmation result from signInUserWithPhone
 * @param code - Verification code sent to phone
 * @returns User object
 */
export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<User> {
  try {
    const result = await confirmationResult.confirm(code);
    return result.user;
  } catch (error: any) {
    throw new Error(`Failed to verify phone code: ${error.message}`);
  }
}

/**
 * Create or update user profile in Firestore
 * @param user - Firebase User object
 * @param fullName - User's full name
 * @param address - User's address
 * @returns Account data
 */
export async function createOrUpdateUserProfile(
  user: User,
  fullName: string,
  address: string
): Promise<UserAccount> {
  try {
    // Check if profile already exists
    const userDocRef = doc(getFirebaseFirestore(), 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const accountData: UserAccount = {
      phone: user.phoneNumber || '',
      fullName,
      address,
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
    };

    // Create or update profile
    await setDoc(userDocRef, accountData, { merge: true });

    return accountData;
  } catch (error: any) {
    throw new Error(`Failed to create/update user profile: ${error.message}`);
  }
}

/**
 * Verify phone number code and create/update user profile (convenience function)
 * @param confirmationResult - Confirmation result from signInUserWithPhone
 * @param code - Verification code sent to phone
 * @param fullName - User's full name
 * @param address - User's address
 * @returns User object and account data
 */
export async function verifyPhoneCodeAndCreateProfile(
  confirmationResult: ConfirmationResult,
  code: string,
  fullName: string,
  address: string
): Promise<{ user: User; accountData: UserAccount }> {
  try {
    const user = await verifyPhoneCode(confirmationResult, code);
    const accountData = await createOrUpdateUserProfile(user, fullName, address);
    return { user, accountData };
  } catch (error: any) {
    throw new Error(`Failed to verify phone code and create profile: ${error.message}`);
  }
}

/**
 * Create a command center account with email and password
 * @param email - Email address
 * @param password - Password
 * @param name - Command center name
 * @param location - Command center location
 * @returns User object and account data
 */
export async function createCommandCenterAccount(
  email: string,
  password: string,
  name: string,
  location: string
): Promise<{ user: User; accountData: CommandCenterAccount }> {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    const user = userCredential.user;

    // Create profile in Firestore
    const accountData: CommandCenterAccount = {
      email,
      name,
      location,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(getFirebaseFirestore(), 'commandCenters', user.uid), accountData);

    return { user, accountData };
  } catch (error: any) {
    throw new Error(`Failed to create command center account: ${error.message}`);
  }
}

/**
 * Sign in dispatcher with email and password
 * @param email - Email address
 * @param password - Password
 * @returns User object
 */
export async function signInDispatcher(
  email: string,
  password: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      normalizedEmail,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    const wrapped = new Error(`Failed to sign in dispatcher: ${error.message}`) as Error & {
      code?: string;
    };
    wrapped.code = error.code;
    throw wrapped;
  }
}

/**
 * Sign in command center with email and password
 * @param email - Email address
 * @param password - Password
 * @returns User object
 */
export async function signInCommandCenter(
  email: string,
  password: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      normalizedEmail,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    const wrapped = new Error(`Failed to sign in command center: ${error.message}`) as Error & {
      code?: string;
    };
    wrapped.code = error.code;
    throw wrapped;
  }
}

/**
 * Civilian user profile interface (from Firestore)
 */
export type CivilianAccountStatus =
  | 'pending_email_verification'
  | 'pending_kyc_review'
  | 'active'
  | 'rejected';

export const GOV_ID_TYPES = [
  'PhilSys',
  "Driver's License",
  'Passport',
  'SSS',
  'GSIS',
  'PhilHealth',
  "Voter's ID",
  'Postal ID',
  'PRC ID',
] as const;

export type GovIdType = (typeof GOV_ID_TYPES)[number];

export interface RegisterCivilianInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  govIdType: GovIdType | string;
  govIdFrontUrl?: string;
  govIdFrontUri?: string;
}

export type RegisterCivilianProgressStep =
  | 'creating_auth'
  | 'uploading_photo'
  | 'saving_profile';

export interface RegisterCivilianOptions {
  onProgress?: (step: RegisterCivilianProgressStep) => void;
}

export interface CivilianUserProfile {
  uid: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  role: string;
  status: CivilianAccountStatus;
  govIdType?: string;
  govIdFrontUrl?: string;
  kycRejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

function parseCivilianUserProfile(
  uid: string,
  profileData: Record<string, unknown>,
  fallbacks?: { email?: string; phone?: string }
): CivilianUserProfile {
  const displayName =
    (typeof profileData.name === 'string' && profileData.name) ||
    (typeof profileData.fullName === 'string' && profileData.fullName) ||
    '';
  const rawStatus = profileData.status;
  const status: CivilianAccountStatus =
    rawStatus === 'pending_email_verification' ||
    rawStatus === 'pending_kyc_review' ||
    rawStatus === 'rejected' ||
    rawStatus === 'active'
      ? rawStatus
      : 'active';

  return {
    uid,
    name: displayName,
    firstName: typeof profileData.firstName === 'string' ? profileData.firstName : undefined,
    lastName: typeof profileData.lastName === 'string' ? profileData.lastName : undefined,
    phone: (profileData.phone as string) || fallbacks?.phone || '',
    email: (profileData.email as string) || fallbacks?.email || '',
    role: (profileData.role as string) || 'civilian',
    status,
    govIdType: typeof profileData.govIdType === 'string' ? profileData.govIdType : undefined,
    govIdFrontUrl: typeof profileData.govIdFrontUrl === 'string' ? profileData.govIdFrontUrl : undefined,
    kycRejectionReason:
      typeof profileData.kycRejectionReason === 'string' ? profileData.kycRejectionReason : undefined,
    createdAt: profileData.createdAt,
    updatedAt: profileData.updatedAt,
  };
}

/**
 * Real-time listener for civilian profile status changes (e.g. KYC approval).
 */
export function subscribeToCivilianUserProfile(
  uid: string,
  callback: (profile: CivilianUserProfile | null) => void,
  onError?: (error: Error) => void
): () => void {
  const userDocRef = doc(getFirebaseFirestore(), 'users', uid);
  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(parseCivilianUserProfile(uid, snapshot.data() || {}));
    },
    (error) => {
      onError?.(error as Error);
    }
  );
}

/**
 * Sign in civilian user with email and password and fetch profile from Firestore
 * @param email - Email address
 * @param password - Password
 * @returns User object and profile data from Firestore
 */
export async function signInCivilian(
  email: string,
  password: string
): Promise<{ user: User; profile: CivilianUserProfile }> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      normalizedEmail,
      password
    );
    const user = userCredential.user;

    const userDocRef = doc(getFirebaseFirestore(), 'users', user.uid);
    let userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const seed: Record<string, unknown> = {
        name: user.displayName || 'Civilian',
        email: normalizedEmail,
        phone: user.phoneNumber || '',
        role: 'civilian',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, seed, { merge: true });
      userDoc = await getDoc(userDocRef);
    }

    const profile = parseCivilianUserProfile(user.uid, userDoc.data() || {}, {
      email: user.email || normalizedEmail,
      phone: user.phoneNumber || '',
    });

    firebaseInfo('User authenticated');
    return { user, profile };
  } catch (error: any) {
    const wrapped = new Error(`Failed to sign in: ${error.message}`) as Error & {
      code?: string;
    };
    wrapped.code = error.code;
    throw wrapped;
  }
}

function mapRegistrationError(error: unknown): Error & { code?: string } {
  const err = error as { code?: string; message?: string };
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : String(error);
  const lower = message.toLowerCase();

  if (code === 'auth/email-already-in-use' || lower.includes('email-already-in-use')) {
    return Object.assign(new Error('An account with this email already exists.'), { code: 'auth/email-already-in-use' });
  }
  if (code === 'auth/weak-password' || lower.includes('weak-password')) {
    return Object.assign(new Error('Password is too weak. Use at least 6 characters.'), { code: 'auth/weak-password' });
  }
  if (code === 'auth/invalid-email' || lower.includes('invalid-email')) {
    return Object.assign(new Error('Please enter a valid email address.'), { code: 'auth/invalid-email' });
  }
  if (
    lower.includes('failed to upload image') ||
    lower.includes('storage upload failed') ||
    lower.includes('arraybuffer') ||
    lower.includes('blob')
  ) {
    return Object.assign(
      new Error('Your account could not be completed because the image upload failed.'),
      { code: 'storage/upload-failed' }
    );
  }
  if (lower.includes('empty') && (lower.includes('image') || lower.includes('photo') || lower.includes('file'))) {
    return Object.assign(new Error('The selected image could not be processed.'), { code: 'storage/invalid-image' });
  }

  const wrapped = new Error(message) as Error & { code?: string };
  if (code) wrapped.code = code;
  return wrapped;
}

async function rollbackCivilianRegistration(input: {
  uid: string;
  user: User | null;
  uploadedStoragePath: string | null;
  firestoreWritten: boolean;
}): Promise<void> {
  if (input.firestoreWritten) {
    try {
      await deleteDoc(doc(getFirebaseFirestore(), 'users', input.uid));
    } catch (cleanupError: unknown) {
      const detail = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.warn('Failed to roll back Firestore profile after registration error:', detail);
    }
  }

  if (input.uploadedStoragePath) {
    await deleteStorageFile(input.uploadedStoragePath);
  }

  if (input.user) {
    try {
      await deleteUser(input.user);
    } catch (cleanupError: unknown) {
      const detail = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.warn('Failed to roll back Firebase Auth user after registration error:', detail);
    }
  }
}

/**
 * Register a civilian with email/password and KYC profile fields.
 * Account stays pending until email OTP and super-admin KYC approval.
 */
export async function registerCivilian(
  input: RegisterCivilianInput,
  options?: RegisterCivilianOptions
): Promise<{ user: User; uid: string; profile: CivilianUserProfile }> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const onProgress = options?.onProgress;

  let createdUser: User | null = null;
  let uploadedStoragePath: string | null = null;
  let firestoreWritten = false;

  try {
    onProgress?.('creating_auth');
    const userCredential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      input.password
    );
    createdUser = userCredential.user;
    const user = createdUser;

    let govIdFrontUrl = (input.govIdFrontUrl || '').trim();
    if (input.govIdFrontUri) {
      onProgress?.('uploading_photo');
      uploadedStoragePath = `kyc-documents/${user.uid}/gov-id-front.jpg`;
      govIdFrontUrl = await uploadImageToStorage(
        input.govIdFrontUri,
        `kyc-documents/${user.uid}/`,
        'gov-id-front.jpg'
      );
    }

    if (!govIdFrontUrl) {
      throw Object.assign(new Error('Government ID photo is required.'), { code: 'storage/invalid-image' });
    }

    onProgress?.('saving_profile');
    const accountData = {
      email,
      firstName,
      lastName,
      name: fullName,
      phone: input.phone,
      address: input.address,
      role: 'civilian' as const,
      status: 'pending_email_verification' as CivilianAccountStatus,
      govIdType: input.govIdType,
      govIdFrontUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(getFirebaseFirestore(), 'users', user.uid), accountData);
    firestoreWritten = true;

    const profile: CivilianUserProfile = {
      uid: user.uid,
      name: fullName,
      firstName,
      lastName,
      phone: input.phone,
      email,
      role: 'civilian',
      status: 'pending_email_verification',
      govIdType: input.govIdType,
      govIdFrontUrl,
    };

    return { user, uid: user.uid, profile };
  } catch (error: unknown) {
    if (createdUser) {
      await rollbackCivilianRegistration({
        uid: createdUser.uid,
        user: createdUser,
        uploadedStoragePath,
        firestoreWritten,
      });
    }

    throw mapRegistrationError(error);
  }
}

/**
 * Verify if the current user is a command center user
 * @returns true if user is a command center, false otherwise
 */
export async function verifyCommandCenterUser(): Promise<boolean> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      return false;
    }

    // Primary source of truth: dedicated command center profile.
    const commandCenterDoc = await getDoc(
      doc(getFirebaseFirestore(), 'commandCenters', currentUser.uid)
    );
    if (commandCenterDoc.exists()) {
      return true;
    }

    // Backward-compatible fallback: role/designation stored under users or dispatchers.
    const readDocSafe = async (collectionName: 'users' | 'dispatchers') => {
      try {
        return await getDoc(doc(getFirebaseFirestore(), collectionName, currentUser.uid));
      } catch (error: any) {
        // Some roles are not allowed to read certain collections; treat as absent.
        const code = typeof error?.code === 'string' ? error.code : '';
        if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED')) {
          return null;
        }
        throw error;
      }
    };

    const [userDoc, dispatcherDoc] = await Promise.all([
      readDocSafe('users'),
      readDocSafe('dispatchers'),
    ]);

    const normalize = (value: unknown): string =>
      typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]/g, '_') : '';

    const acceptedRoleValues = new Set([
      'command_center',
      'commandcenter',
      'command',
      'command_admin',
      'command_center_admin',
    ]);

    const roleFromUser = normalize(userDoc?.data()?.role);
    const roleFromDispatcher = normalize(dispatcherDoc?.data()?.role);
    const designationFromDispatcher = normalize(dispatcherDoc?.data()?.designation);

    if (
      acceptedRoleValues.has(roleFromUser) ||
      acceptedRoleValues.has(roleFromDispatcher) ||
      acceptedRoleValues.has(designationFromDispatcher)
    ) {
      return true;
    }

    // Optional fallback: custom auth claims.
    const tokenResult = await currentUser.getIdTokenResult();
    const claimRole = normalize(tokenResult.claims?.role);
    const claimDesignation = normalize(tokenResult.claims?.designation);
    const claimCommandCenter = tokenResult.claims?.isCommandCenter === true;

    return (
      claimCommandCenter ||
      acceptedRoleValues.has(claimRole) ||
      acceptedRoleValues.has(claimDesignation)
    );
  } catch (error: any) {
    console.error('Error verifying command center user:', error);
    return false;
  }
}

/**
 * Get all active dispatchers from Firestore
 * @returns Array of dispatcher accounts with their UIDs
 */
export async function getAllDispatchers(): Promise<Array<{ uid: string; account: DispatcherAccount }>> {
  try {
    console.log('[getAllDispatchers] Starting to fetch dispatchers...');
    const dispatchersRef = collection(getFirebaseFirestore(), 'dispatchers');
    
    // Try to query with active filter first, but fall back to getting all if it fails
    let querySnapshot;
    try {
      const q = query(dispatchersRef, where('active', '==', true));
      querySnapshot = await getDocs(q);
      console.log(`[getAllDispatchers] Query with active filter returned ${querySnapshot.size} documents`);

      // Backward compatibility: older dispatcher docs may not include `active`.
      // If strict query returns none, fetch all and apply relaxed in-memory filter.
      if (querySnapshot.empty) {
        console.log('[getAllDispatchers] No active==true docs found, falling back to full collection scan');
        querySnapshot = await getDocs(dispatchersRef);
        console.log(`[getAllDispatchers] Fallback fetched ${querySnapshot.size} dispatcher documents`);
      }
    } catch (queryError: any) {
      // If query fails (e.g., missing index), get all dispatchers and filter in memory
      console.warn('[getAllDispatchers] Query with active filter failed, fetching all dispatchers:', queryError.message);
      querySnapshot = await getDocs(dispatchersRef);
      console.log(`[getAllDispatchers] Fetched all ${querySnapshot.size} dispatcher documents`);
    }
    
    const dispatchers: Array<{ uid: string; account: DispatcherAccount }> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Backward compatibility: older dispatcher docs may not have `active`.
      // Treat missing as active unless explicitly false.
      const isActive = data.active !== false;
      
      if (isActive) {
        dispatchers.push({
          uid: doc.id,
          account: {
            fullName: data.fullName || '',
            email: data.email || '',
            role: data.role || 'BFP',
            designation: data.designation || null,
            teamCode: data.teamCode || null,
            teamLabel: data.teamLabel || null,
            createdAt: data.createdAt,
            active: true,
          },
        });
      }
    });
    
    console.log(`[getAllDispatchers] Returning ${dispatchers.length} active dispatchers`);
    return dispatchers;
  } catch (error: any) {
    console.error('[getAllDispatchers] Error fetching dispatchers:', error);
    throw new Error(`Failed to fetch dispatchers: ${error.message}`);
  }
}

