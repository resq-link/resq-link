import {
  signInDispatcher,
  getDoc,
  doc,
  getFirebaseFirestore,
  signOut,
  getFirebaseAuth,
} from "@packages/firebase";

export type DispatcherProfile = {
  uid: string;
  email: string;
  role?: string;
  active: boolean;
  createdAt?: unknown;
};

/**
 * Sign in dispatcher and verify role against Firestore.
 */
export async function signInDispatcherWithVerification(
  email: string,
  password: string
): Promise<{ user: unknown; profile: DispatcherProfile }> {
  const user = await signInDispatcher(email, password);

  const dispatcherDocRef = doc(getFirebaseFirestore(), "dispatchers", user.uid);
  const dispatcherDoc = await getDoc(dispatcherDocRef);

  if (!dispatcherDoc.exists()) {
    await signOut(getFirebaseAuth());
    throw new Error("Access denied. Responder account required.");
  }

  const dispatcherData = dispatcherDoc.data();

  if (dispatcherData.active === false) {
    await signOut(getFirebaseAuth());
    throw new Error(
      "Your dispatcher account has been deactivated. Please contact support."
    );
  }

  const profile: DispatcherProfile = {
    uid: user.uid,
    email: dispatcherData.email || email,
    role: dispatcherData.role,
    active: dispatcherData.active !== false,
    createdAt: dispatcherData.createdAt,
  };

  return { user, profile };
}
