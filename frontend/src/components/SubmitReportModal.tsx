// frontend/src/components/SubmitReportModal.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X, Send } from 'lucide-react';
import { useToastStore } from '@/lib/toastStore';

interface Manager {
  id: string;
  full_name: string;
}

interface SubmitReportModalProps {
  reportId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmitReportModal({ reportId, onClose, onSubmitted }: SubmitReportModalProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    const fetchManagers = async () => {
      if (!token) return;
      try {
        const response = await api.get('/user/my-managers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setManagers(response.data);
        if (response.data.length > 0) {
          setSelectedManager(response.data[0].id);
        }
      } catch (err) {
        setError('Could not load your managers.');
        showToast('Could not load your list of managers.', 'error');
      }
    };
    fetchManagers();
  }, [token, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager) {
      showToast('Please select a manager to submit the report to.', 'error');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(
        `/expense-report/${reportId}/submit`,
        { manager_id: selectedManager },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast('Report submitted successfully!', 'success');
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report.');
      showToast(err.response?.data?.message || 'Failed to submit report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Submit Report for Approval</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
              Select Approver
            </label>
            <select
              id="manager"
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            >
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
            {managers.length === 0 && !error && (
              <p className="mt-2 text-sm text-gray-500">
                You do not have any managers assigned to approve your reports.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-center text-danger">{error}</p>}
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
              disabled={isSubmitting || !selectedManager}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}