import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SessionUser = {
  uid: string;
  email: string;
  role?: string;
  active?: boolean;
};

type UserStoreState = {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (user: SessionUser | null) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const useUserStore = create<UserStoreState>((set) => ({
  user: null,
  isLoading: true,

  setUser: async (user) => {
    set({ user });
    if (user) {
      await AsyncStorage.setItem("dispatcher_user", JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem("dispatcher_user");
    }
  },

  loadUser: async () => {
    try {
      const userData = await AsyncStorage.getItem("dispatcher_user");
      if (userData) {
        set({ user: JSON.parse(userData) as SessionUser, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Error loading user:", error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("dispatcher_user");
    set({ user: null });
  },
}));

export default useUserStore;
