import { toast as sonnerToast } from "sonner-native";

/**
 * sonner-native exposes toast(), toast.success(), toast.loading(), etc.
 * but not toast.message(). This shim keeps existing call sites working.
 */
export const toast = Object.assign(
  (message, options) => sonnerToast(message, options),
  sonnerToast,
  {
    message: (message, options) => sonnerToast(message, options),
  },
);
