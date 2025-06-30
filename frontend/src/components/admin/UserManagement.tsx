// src/components/admin/UserManagement.tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Pencil, Trash2, UserPlus, KeyRound } from 'lucide-react'; // Add KeyRound
import UserFormModal from './UserFormModal';
import ResetPasswordModal from './ResetPasswordModal'; // Import the new modal

export default function UserManagement({ users, onDataChange }: any) {
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [isResetModalOpen, setResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const token = useAuthStore(state => state.token);

    const handleSaveUser = async (userData: any) => {
        try {
            if (selectedUser) {
                await api.patch(`/admin/users/${(selectedUser as any).id}`, userData, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await api.post('/admin/users', userData, { headers: { Authorization: `Bearer ${token}` } });
            }
            onDataChange();
            setUserModalOpen(false);
            setSelectedUser(null);
        } catch (error) {
            console.error("Failed to save user", error);
            throw error;
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            try {
                await api.delete(`/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
                onDataChange();
            } catch (error) {
                console.error("Failed to delete user", error);
                alert("Could not delete user.");
            }
        }
    };

    const handleOpenEdit = (user: any) => {
        setSelectedUser(user);
        setUserModalOpen(true);
    };

    const handleOpenReset = (user: any) => {
        setSelectedUser(user);
        setResetModalOpen(true);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <button onClick={() => { setSelectedUser(null); setUserModalOpen(true); }} className="inline-flex items-center px-3 py-1 text-sm text-white rounded-md bg-primary hover:bg-primary-hover"><UserPlus className="w-4 h-4 mr-2"/>Add User</button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Roles</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                    {users.map((user: any) => (
                        <tr key={user.id}>
                            <td className="px-4 py-2">{user.full_name}</td>
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">{user.roles.join(', ')}</td>
                            <td className="flex justify-end px-4 py-2 space-x-2">
                                <button onClick={() => handleOpenReset(user)} title="Reset Password"><KeyRound className="w-4 h-4 text-gray-500"/></button>
                                <button onClick={() => handleOpenEdit(user)} title="Edit User"><Pencil className="w-4 h-4 text-gray-500"/></button>
                                <button onClick={() => handleDeleteUser(user.id)} title="Delete User"><Trash2 className="w-4 h-4 text-danger"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {isUserModalOpen && <UserFormModal user={selectedUser} onClose={() => setUserModalOpen(false)} onDataChange={onDataChange} />}
            {isResetModalOpen && <ResetPasswordModal user={selectedUser} onClose={() => setResetModalOpen(false)} onPasswordReset={() => setResetModalOpen(false)} />}
        </div>
    );
}