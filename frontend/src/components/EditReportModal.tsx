// frontend/src/components/EditReportModal.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X, Save } from 'lucide-react';
import { useToastStore } from '@/lib/toastStore';

interface EditReportModalProps {
  reportId: string;
  currentTitle: string;
  onClose: () => void;
  onReportUpdated: () => void;
}

export default function EditReportModal({
  reportId,
  currentTitle,
  onClose,
  onReportUpdated,
}: EditReportModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title cannot be empty.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(
        `/expense-report/${reportId}`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast('Report updated successfully!', 'success');
      onReportUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Report Title</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Report Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}