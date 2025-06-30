// src/components/BrandedHeader.tsx
'use client';

import Image from 'next/image';

export default function BrandedHeader() {
  return (
    <header className="px-4 py-2 bg-gradient-to-r from-white to-black shadow-lg sm:px-6 lg:px-8">
      <div className="flex items-center">
        <Image
          src="/opiatech-logo.svg"
          alt="Opiatech Logo"
          width={40}
          height={40}
          className="w-auto h-10"
        />
      </div>
    </header>
  );
}