import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';
import { useAuthStore, authKey } from "@/stores/authStore";

/**
 * Bootstraps persisted JWT auth state from SecureStore.
 * Used by the root layout to gate splash screen visibility.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();

  const initiate = useCallback(() => {
    SecureStore.getItemAsync(authKey)
      .then((stored) => {
        let auth = null;
        if (stored) {
          try {
            auth = JSON.parse(stored);
          } catch {
            auth = null;
          }
        }
        useAuthStore.setState({ auth, isReady: true });
      })
      .catch(() => {
        useAuthStore.setState({ auth: null, isReady: true });
      });
  }, []);

  const signOut = useCallback(() => {
    setAuth(null);
  }, [setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signOut,
    auth,
    setAuth,
    initiate,
  };
};

export default useAuth;
