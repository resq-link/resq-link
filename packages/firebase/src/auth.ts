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
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, firestore } from './config';

// Dispatcher roles
export type DispatcherRole = 'BFP' | 'PNP' | 'MDRRMO' | 'AMBULANCE' | 'PCG';

// Dispatcher account interface
export interface DispatcherAccount {
  email: string;
  role: DispatcherRole;
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create profile in Firestore
    const accountData: DispatcherAccount = {
      email,
      role,
      createdAt: serverTimestamp(),
      active: true,
    };

    await setDoc(doc(firestore, 'dispatchers', user.uid), accountData);

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

      recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber
        },
      });
    }

    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(
      auth,
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
    const userDocRef = doc(firestore, 'users', user.uid);
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create profile in Firestore
    const accountData: CommandCenterAccount = {
      email,
      name,
      location,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(firestore, 'commandCenters', user.uid), accountData);

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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(`Failed to sign in command center: ${error.message}`);
  }
}

