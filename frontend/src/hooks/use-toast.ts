import toast from "react-hot-toast";

/**
 * Toast helper wrapping react-hot-toast.
 * Provides success/error/info with consistent styling.
 */
export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id: string) => toast.dismiss(id),
};
