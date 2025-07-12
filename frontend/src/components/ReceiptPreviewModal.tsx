// frontend/src/components/ReceiptPreviewModal.tsx

'use client';

import { X } from 'lucide-react';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  mimeType: string;
}

export default function ReceiptPreviewModal({ isOpen, onClose, previewUrl, mimeType }: ReceiptPreviewModalProps) {
  if (!isOpen) {
    return null;
  }

  // This allows the user to close the modal by clicking the background overlay
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75" 
      onClick={handleBackdropClick}
    >
      <div 
        className="relative w-full h-full max-w-4xl max-h-[90vh] p-4 bg-white rounded-lg shadow-xl" 
        onClick={(e) => e.stopPropagation()} // Prevents modal from closing when clicking inside
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 z-10"
          aria-label="Close preview"
        >
          <X size={24} />
        </button>
        <div className="w-full h-full">
          {mimeType.startsWith('image/') ? (
            <img src={previewUrl} alt="Receipt Preview" className="object-contain w-full h-full" />
          ) : mimeType === 'application/pdf' ? (
            <embed src={previewUrl} type="application/pdf" className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-center text-gray-600">
              <p>Unsupported file type for preview: {mimeType}.<br/>Please download the file to view.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
