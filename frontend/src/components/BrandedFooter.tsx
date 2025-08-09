// frontend/src/components/BrandedFooter.tsx

'use client';

import { version } from '@/lib/version';

export default function BrandedFooter() {
  return (
    <footer className="p-4 mt-auto text-center text-white bg-gradient-to-r from-gray-200 to-black">
      <p>&copy; {new Date().getFullYear()} Opiatech (Pty) Ltd. All rights reserved.</p>
      <p className="text-xs">Expense Management System</p>
      <p className="text-[10px] text-gray-400 mt-2">
        {version.fullVersion}
      </p>
    </footer>
  );
}