import { create } from "zustand";

const useSOSStore = create((set, get) => ({
  confirmVisible: false,
  confirmHandler: null,

  registerConfirmHandler: (handler) => set({ confirmHandler: handler }),

  openConfirmation: () => {
    const { confirmVisible } = get();
    if (confirmVisible) return;

    set({ confirmVisible: true });
  },

  closeConfirmation: () => {
    set({ confirmVisible: false });
  },

  confirm: async () => {
    const { confirmHandler } = get();
    get().closeConfirmation();
    if (confirmHandler) {
      try {
        await confirmHandler();
      } catch (error) {
        if (__DEV__) {
          console.error("SOS confirm handler failed:", error);
        }
      }
    }
  },
}));

export default useSOSStore;

