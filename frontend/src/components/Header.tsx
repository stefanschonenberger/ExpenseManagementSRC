// src/components/Header.tsx
'use client';
import { useAuthStore } from '@/lib/store';
import { LogOut } from 'lucide-react';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <div><h1 className="text-xl font-semibold text-gray-800">Dashboard</h1></div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.email}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.roles?.join(', ').toLowerCase()}</p>
        </div>
        <button onClick={logout} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700"><LogOut className="w-5 h-5" /></button>
      </div>
    </header>
  );
}