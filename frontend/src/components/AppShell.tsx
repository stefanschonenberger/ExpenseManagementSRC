'use client';

import { useAuthStore } from '@/lib/store';
import LoginPage from './LoginPage';
import DashboardLayout from './DashboardLayout';
import { useEffect, useState } from 'react';
import { useIdleTimeout } from '@/lib/useIdleTimeout';
import { useSettingsStore } from '@/lib/settingsStore';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token, fetchSettings]);
  
  // ** FIX: Changed snake_case to camelCase to match the settings object property **
  const timeoutMs = settings ? settings.inactivityTimeoutMinutes * 60 * 1000 : null;
  
  useIdleTimeout(timeoutMs); 
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Render nothing on the server.
  }

  if (token === null) {
      return <LoginPage />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
