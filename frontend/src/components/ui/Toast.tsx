// frontend/src/components/ui/Toast.tsx
'use client';

import { useEffect } from 'react';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';

const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const typeStyles = {
    success: {
      bgColor: 'bg-green-100',
      borderColor: 'border-green-400',
      textColor: 'text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    },
    error: {
      bgColor: 'bg-red-100',
      borderColor: 'border-red-400',
      textColor: 'text-red-800',
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    },
    info: {
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800',
      icon: <Info className="h-5 w-5 text-blue-500" />,
    },
  }[type];

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-sm w-full rounded-lg shadow-lg border-l-4 ${typeStyles.borderColor} ${typeStyles.bgColor} p-4 animate-fade-in-up`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{typeStyles.icon}</div>
        <div className="ml-3 flex-1 pt-0.5">
          <p className={`text-sm font-medium ${typeStyles.textColor}`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className={`inline-flex rounded-md p-1 ${typeStyles.textColor} hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-100 focus:ring-${type}-500`}
          >
            <span className="sr-only">Close</span>
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export { Toast };