// src/lib/settingsStore.ts
import { create } from 'zustand';
import api from './api';

interface Settings {
  inactivityTimeoutMinutes: number;
  expenseTypes: string[];
}

interface SettingsState {
  settings: Settings | null;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  fetchSettings: async () => {
    try {
      const response = await api.get('/settings');
      set({ settings: response.data });
    } catch (error) {
      console.error("Failed to fetch settings, using default timeout.", error);
      // Set a default timeout if the API call fails to prevent being logged out instantly
      set({ settings: { inactivityTimeoutMinutes: 30, expenseTypes: ['General'] } });
    }
  },
}));