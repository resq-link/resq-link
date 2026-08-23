import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI_MODE } from "@/services/api";
const useUserStore = create((set) => ({
  user: null,
  isLoading: true,

  setUser: async (user) => {
    set({ user });
    if (user) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem("user");
    }
  },

  loadUser: async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
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

  refreshUserFromFirestore: async () => {
    try {
      const current = useUserStore.getState().user;
      if (!current?.uid || UI_MODE) {
        return current;
      }

      const { getFirebaseFirestore, getDoc, doc } = require("@packages/firebase");
      const snap = await getDoc(doc(getFirebaseFirestore(), "users", current.uid));
      if (!snap.exists()) {
        return current;
      }

      const data = snap.data() || {};
      const nextUser = {
        ...current,
        email: data.email || current.email,
        name: data.name || current.name,
        firstName: data.firstName || current.firstName,
        lastName: data.lastName || current.lastName,
        phone: data.phone || current.phone,
        status: data.status || current.status,
      };

      await useUserStore.getState().setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (__DEV__) {
        console.warn("Could not refresh user profile:", error);
      }
      return useUserStore.getState().user;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("user");
    set({ user: null, isLoading: false });
  },
}));

export default useUserStore;
