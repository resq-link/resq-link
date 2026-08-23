'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ToastProvider';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type SignOutFlowValue = {
  /** Open the shared Sign Out confirmation dialog. */
  requestSignOut: () => void;
  isSigningOut: boolean;
};

const SignOutFlowContext = createContext<SignOutFlowValue | undefined>(undefined);

/**
 * One confirmation dialog + sign-out handler for the entire Super Admin shell
 * (sidebar, profile menu, etc.).
 */
export function SignOutFlowProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAdminAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const requestSignOut = useCallback(() => {
    if (isSigningOut) return;
    setOpen(true);
  }, [isSigningOut]);

  const close = useCallback(() => {
    if (isSigningOut) return;
    setOpen(false);
  }, [isSigningOut]);

  const confirm = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      // Keep busy=true through redirect so buttons cannot be re-clicked.
    } catch (error) {
      console.error('Sign out failed', error);
      toast.error('Unable to sign out. Please try again.');
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut, toast]);

  const value = useMemo(
    () => ({ requestSignOut, isSigningOut }),
    [requestSignOut, isSigningOut]
  );

  return (
    <SignOutFlowContext.Provider value={value}>
      {children}
      <Dialog open={open} title="Sign out?" onClose={close}>
        <p className="text-sm text-admin-fg-muted">
          Are you sure you want to sign out of RESQ-LINK Platform Administration?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={isSigningOut} onClick={close}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={isSigningOut} onClick={() => void confirm()}>
            {isSigningOut ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </Dialog>
    </SignOutFlowContext.Provider>
  );
}

export function useSignOutFlow() {
  const context = useContext(SignOutFlowContext);
  if (!context) {
    throw new Error('useSignOutFlow must be used within SignOutFlowProvider');
  }
  return context;
}
