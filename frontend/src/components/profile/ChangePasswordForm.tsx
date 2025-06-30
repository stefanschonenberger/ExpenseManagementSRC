// src/components/profile/ChangePasswordForm.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function ChangePasswordForm() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const token = useAuthStore(state => state.token);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.patch('/user/change-password', { oldPassword, newPassword }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess("Password changed successfully!");
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to change password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium">Current Password</label>
                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full p-2 mt-1 border rounded"/>
                </div>
                <div>
                    <label className="block text-sm font-medium">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full p-2 mt-1 border rounded"/>
                </div>
                <div>
                    <label className="block text-sm font-medium">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 mt-1 border rounded"/>
                </div>
                
                {error && <p className="text-sm text-center text-danger">{error}</p>}
                {success && <p className="text-sm text-center text-success">{success}</p>}

                <div className="pt-2">
                    <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2 text-white rounded bg-primary hover:bg-primary-hover disabled:bg-gray-400">
                        {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );
}