// ==========================================================
// File: src/lib/toastStore.ts
// Create this new file to manage the global state of notifications.
// ==========================================================
'use client';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string | null;
  type: ToastType;
  isVisible: boolean;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  isVisible: false,
  showToast: (message, type = 'info') => {
    set({ message, type, isVisible: true });
    // Automatically hide the toast after 4 seconds
    setTimeout(() => {
      set({ isVisible: false });
    }, 4000);
  },
  hideToast: () => set({ isVisible: false }),
}));