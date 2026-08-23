import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const projectGroupId = process.env.EXPO_PUBLIC_PROJECT_GROUP_ID;
export const authKey = `${projectGroupId || 'resqlink'}-jwt`;

/**
 * Manages persisted JWT authentication state.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      SecureStore.setItemAsync(authKey, JSON.stringify(auth)).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(authKey).catch(() => {});
    }
    set({ auth });
  },
}));
