// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';
import BrandedHeader from '@/components/BrandedHeader';
import BrandedFooter from '@/components/BrandedFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expense Management',
  description: 'Management your expense reports.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-200`}>
        <BrandedHeader />
        <AppShell>{children}</AppShell>
        <BrandedFooter />
      </body>
    </html>
  );
}