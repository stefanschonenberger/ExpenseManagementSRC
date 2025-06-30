// src/components/AppShell.tsx

'use client';

import { useAuthStore } from '@/lib/store';
import LoginPage from './LoginPage';
import DashboardLayout from './DashboardLayout'; // Import the new layout
import { useEffect, useState } from 'react';
import { useIdleTimeout } from '@/lib/useIdleTimeout'; // Import the new hook
import { useSettingsStore } from '@/lib/settingsStore'; // Import the new settings store

export default function AppShell({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const { settings, fetchSettings } = useSettingsStore();
  
  // Calculate timeout in milliseconds from the fetched settings, providing a fallback
  const timeoutMs = settings ? settings.inactivityTimeoutMinutes * 60 * 1000 : null;
  
  // The hook is now dynamic and will activate once settings are fetched
  useIdleTimeout(timeoutMs); 
  
  // This state is necessary to prevent hydration errors with localStorage
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Render nothing on the server
  }

  if (token === null) {
      return <LoginPage />;
  }

  // If we have a token, render the DashboardLayout with the page content
  return <DashboardLayout>{children}</DashboardLayout>;
}