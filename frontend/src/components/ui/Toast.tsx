// ==========================================================
// File: src/components/ui/Toast.tsx
// Create this new component for the notification UI.
// Create the 'ui' folder if it doesn't exist.
// ==========================================================
'use client';
import { useToastStore } from '@/lib/toastStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { message, type, isVisible, hideToast } = useToastStore();

  if (!isVisible) return null;

  const toastStyles = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
  };

  const Icon = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <XCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  }[type];

  return (
    <div className={`fixed bottom-5 right-5 z-50 p-4 border-l-4 rounded-md shadow-lg flex items-center ${toastStyles[type]}`}>
      <div className="flex-shrink-0">{Icon}</div>
      <div className="ml-3">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={hideToast} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 inline-flex h-8 w-8">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}