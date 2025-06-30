// src/components/admin/ResetPasswordModal.tsx
'use client';
import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function ResetPasswordModal({ user, onClose, onPasswordReset }: any) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = useAuthStore(state => state.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, 
        { newPassword }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onPasswordReset(); // Notify parent on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reset Password for {user.full_name}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full p-2 mt-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 mt-1 border rounded" />
          </div>
          {error && <p className="text-sm text-center text-danger">{error}</p>}
          <div className="flex justify-end pt-2 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 text-white rounded bg-primary disabled:bg-gray-400">
              <KeyRound className="w-4 h-4 mr-2"/>
              {isSubmitting ? 'Resetting...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}