import {
  signInDispatcher,
  getDoc,
  doc,
  getFirebaseFirestore,
  signOut,
  getFirebaseAuth,
} from "@packages/firebase";

/**
 * Sign in dispatcher and verify role
 * @param {string} email - Dispatcher email
 * @param {string} password - Dispatcher password
 * @returns {Promise<{user: any, profile: any}>} User and profile data
 */
export async function signInDispatcherWithVerification(email, password) {
  try {
    // Sign in with Firebase Auth
    const user = await signInDispatcher(email, password);
    
    // Verify user exists in dispatchers collection
    const dispatcherDocRef = doc(getFirebaseFirestore(), 'dispatchers', user.uid);
    const dispatcherDoc = await getDoc(dispatcherDocRef);
    
    if (!dispatcherDoc.exists()) {
      // Sign out if not a dispatcher
      await signOut(getFirebaseAuth());
      throw new Error('Access denied. Responder account required.');
    }
    
    const dispatcherData = dispatcherDoc.data();
    
    // Check if dispatcher is active
    if (dispatcherData.active === false) {
      await signOut(getFirebaseAuth());
      throw new Error('Your dispatcher account has been deactivated. Please contact support.');
    }
    
    // Return user and profile
    const profile = {
      uid: user.uid,
      email: dispatcherData.email || email,
      role: dispatcherData.role,
      active: dispatcherData.active !== false,
      createdAt: dispatcherData.createdAt,
    };
    
    return { user, profile };
  } catch (error) {
    console.error('Responder authentication error:', error);
    throw error;
  }
}

