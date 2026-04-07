import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  User,
  PhoneAuthProvider,
  signInWithCredential,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';

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
  try {
    const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(`Failed to sign in dispatcher: ${error.message}`);
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
  try {
    const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(`Failed to sign in command center: ${error.message}`);
  }
}

/**
 * Civilian user profile interface (from Firestore)
 */
export interface CivilianUserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  createdAt?: any;
  updatedAt?: any;
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
  try {
    // Sign in with email and password
    const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const userDocRef = doc(getFirebaseFirestore(), 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found. Please contact support.');
    }

    const profileData = userDoc.data();
    const profile: CivilianUserProfile = {
      uid: user.uid,
      name: profileData.name || '',
      phone: profileData.phone || '',
      email: profileData.email || email,
      role: profileData.role || 'civilian',
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt,
    };

    return { user, profile };
  } catch (error: any) {
    throw new Error(`Failed to sign in: ${error.message}`);
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
    
    const commandCenterDoc = await getDoc(doc(getFirebaseFirestore(), 'commandCenters', currentUser.uid));
    return commandCenterDoc.exists();
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
    } catch (queryError: any) {
      // If query fails (e.g., missing index), get all dispatchers and filter in memory
      console.warn('[getAllDispatchers] Query with active filter failed, fetching all dispatchers:', queryError.message);
      querySnapshot = await getDocs(dispatchersRef);
      console.log(`[getAllDispatchers] Fetched all ${querySnapshot.size} dispatcher documents`);
    }
    
    const dispatchers: Array<{ uid: string; account: DispatcherAccount }> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter in memory if we got all documents (active might be missing or false)
      const isActive = data.active !== false && data.active !== undefined;
      
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

