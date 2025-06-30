// src/components/RejectReportModal.tsx

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface RejectReportModalProps {
  onClose: () => void;
  onReject: (reason: string) => void;
}

export default function RejectReportModal({ onClose, onReject }: RejectReportModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onReject(reason);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Reject Report</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason for Rejection
            </label>
            <textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-danger hover:bg-danger-hover">
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}