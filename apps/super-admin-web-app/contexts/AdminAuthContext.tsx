'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore, doc, getDoc, onAuthStateChanged, signOut as firebaseSignOut } from '@packages/firebase';
import type { User } from '@packages/firebase';
import { useRouter } from 'next/navigation';

interface AdminAuthContextType {
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const adminDoc = await getDoc(doc(firestore, 'admins', authUser.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const adminDoc = await getDoc(doc(firestore, 'admins', userCredential.user.uid));
    if (!adminDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error('Access denied. You are not a super admin.');
    }
    router.push('/dashboard');
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIsAdmin(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
