// ==========================================================
// File: src/components/AppShell.tsx
// Update this file to render the Toast component.
// ==========================================================
'use client';

import { useAuthStore } from '@/lib/store';
import LoginPage from './LoginPage';
import DashboardLayout from './DashboardLayout';
import { useEffect, useState } from 'react';
import { useIdleTimeout } from '@/lib/useIdleTimeout';
import { useSettingsStore } from '@/lib/settingsStore';
import Toast from './ui/Toast'; // Import the Toast component

export default function AppShell({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const timeoutMs = settings ? settings.inactivityTimeoutMinutes * 60 * 1000 : null;
  
  useIdleTimeout(timeoutMs); 

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex-grow">
      {token === null ? <LoginPage /> : <DashboardLayout>{children}</DashboardLayout>}
      <Toast /> {/* Render the Toast component here */}
    </div>
  );
}