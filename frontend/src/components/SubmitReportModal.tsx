// ==========================================================
// File: src/components/SubmitReportModal.tsx
// Create this new file.
// ==========================================================
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X } from 'lucide-react';

interface Manager {
  id: string;
  full_name: string;
}

interface SubmitReportModalProps {
  onClose: () => void;
  onSubmit: (managerId: string) => void;
}

export default function SubmitReportModal({ onClose, onSubmit }: SubmitReportModalProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchManagers = async () => {
      if (!token) return;
      try {
        const response = await api.get('/user/my-managers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setManagers(response.data);
        if (response.data.length > 0) {
          setSelectedManager(response.data[0].id);
        }
      } catch (err) {
        setError("Could not load your managers.");
      }
    }
    fetchManagers();
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedManager) {
      onSubmit(selectedManager);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Submit Report for Approval</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="manager" className="block text-sm font-medium text-gray-700">Select Approver</label>
            <select
              id="manager"
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            >
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>{manager.full_name}</option>
              ))}
            </select>
            {managers.length === 0 && <p className="mt-2 text-sm text-gray-500">You do not have any managers assigned to approve your reports.</p>}
          </div>
          {error && <p className="text-sm text-center text-danger">{error}</p>}
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={!selectedManager} className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400">Confirm Submission</button>
          </div>
        </form>
      </div>
    </div>
  );
}