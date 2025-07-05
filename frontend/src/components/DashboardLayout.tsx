'use client';

import { useAuthStore } from '@/lib/store';
import { LayoutDashboard, Receipt, ClipboardList, ClipboardCheck, Shield, UserCircle } from 'lucide-react'; // 1. Import UserCircle icon
import Link from 'next/link';
import Header from './Header';

// 2. Add "My Profile" to the navigation array
const employeeNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Expenses', href: '/expenses', icon: Receipt },
  { name: 'My Reports', href: '/reports', icon: ClipboardList },
  { name: 'My Profile', href: '/profile', icon: UserCircle },
];
const managerNavigation = [ { name: 'Approvals', href: '/approvals', icon: ClipboardCheck } ];
const adminNavigation = [ { name: 'Admin Panel', href: '/admin', icon: Shield } ];

export default function DashboardLayout({ children }: { children: React.ReactNode; }) {
  const user = useAuthStore((state) => state.user);
  const isManager = useAuthStore((state) => state.isManager);

  return (
    <div className="flex w-full h-full bg-gray-100">
      <aside className="flex-shrink-0 w-64 p-4 space-y-4 bg-white border-r">
        <div className="text-xl font-bold text-primary">Expense Management</div>
        <nav className="space-y-2">
          <h3 className="px-3 pt-4 text-xs font-semibold text-gray-500 uppercase">My Workspace</h3>
          {employeeNavigation.map((item) => (
            <Link key={item.name} href={item.href} className="flex items-center px-3 py-2 space-x-3 text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
          
          {isManager && (
            <>
              <h3 className="px-3 pt-4 text-xs font-semibold text-gray-500 uppercase">Management</h3>
              {managerNavigation.map((item) => (
                <Link key={item.name} href={item.href} className="flex items-center px-3 py-2 space-x-3 text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </>
          )}

          {user && user.roles && user.roles.includes('ADMIN') && (
            <>
              <h3 className="px-3 pt-4 text-xs font-semibold text-gray-500 uppercase">Administration</h3>
              {adminNavigation.map((item) => (
                <Link key={item.name} href={item.href} className="flex items-center px-3 py-2 space-x-3 text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>

      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
