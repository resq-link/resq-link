import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useUserStore = create((set) => ({
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
        set({ user: JSON.parse(userData), isLoading: false });
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

