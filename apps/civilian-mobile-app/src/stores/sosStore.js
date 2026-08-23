import { create } from "zustand";

export const SOS_CONFIRM_TIMEOUT_SEC = 10;

const useSOSStore = create((set, get) => ({
  confirmVisible: false,
  secondsLeft: SOS_CONFIRM_TIMEOUT_SEC,
  intervalId: null,
  confirmHandler: null,

  registerConfirmHandler: (handler) => set({ confirmHandler: handler }),

  openConfirmation: () => {
    const { confirmVisible, intervalId } = get();
    if (confirmVisible) return;

    if (intervalId) clearInterval(intervalId);

    set({
      confirmVisible: true,
      secondsLeft: SOS_CONFIRM_TIMEOUT_SEC,
    });

    const nextIntervalId = setInterval(() => {
      const left = get().secondsLeft - 1;
      if (left <= 0) {
        get().closeConfirmation();
        return;
      }
      set({ secondsLeft: left });
    }, 1000);

    set({ intervalId: nextIntervalId });
  },

  closeConfirmation: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({
      confirmVisible: false,
      secondsLeft: SOS_CONFIRM_TIMEOUT_SEC,
      intervalId: null,
    });
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
