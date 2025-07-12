// frontend/src/components/BrandedFooter.tsx

'use client';

export default function BrandedFooter() {
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION;

  return (
    <footer className="p-4 mt-auto text-center text-white bg-gradient-to-r from-gray-200 to-black">
      <p>&copy; {new Date().getFullYear()} Opiatech (Pty) Ltd. All rights reserved.</p>
      <p className="text-xs">Expense Management System</p>
      {buildVersion && (
        <p className="text-xs text-gray-400 mt-2">
          Build Version: {buildVersion}
        </p>
      )}
    </footer>
  );
}