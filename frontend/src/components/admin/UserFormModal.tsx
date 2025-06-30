// src/components/admin/UserFormModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const ALL_ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN'];

export default function UserFormModal({ user, onClose, onDataChange }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['EMPLOYEE']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = useAuthStore(state => state.token);
  const isEditMode = !!user;

  useEffect(() => {
    if (isEditMode) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setSelectedRoles(user.roles || []);
    }
  }, [user, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    const payload: any = {
        full_name: fullName,
        email: email,
        roles: selectedRoles,
    };
    if (!isEditMode && password) {
        payload.password = password;
    }

    try {
        if (isEditMode) {
            await api.patch(`/admin/users/${user.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        } else {
            await api.post('/admin/users', payload, { headers: { Authorization: `Bearer ${token}` } });
        }
        onDataChange();
        onClose();
    } catch (err: any) {
        setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRoles(prev => 
        prev.includes(role) 
            ? prev.filter(r => r !== role)
            : [...prev, role]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{isEditMode ? 'Edit User' : 'Create New User'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input name="full_name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" required className="w-full p-2 border rounded" />
          <input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className="w-full p-2 border rounded" />
          {!isEditMode && <input name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={8} className="w-full p-2 border rounded" />}
          
          <div>
            <label className="block text-sm font-medium">Roles</label>
            <div className="mt-2 space-y-2">
                {ALL_ROLES.map(role => (
                    <div key={role} className="flex items-center">
                        <input id={role} type="checkbox" checked={selectedRoles.includes(role)} onChange={() => handleRoleChange(role)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"/>
                        <label htmlFor={role} className="ml-2 text-sm text-gray-700">{role}</label>
                    </div>
                ))}
            </div>
          </div>
          
          {error && <p className="p-2 text-sm text-center text-white rounded-md bg-danger">{Array.isArray(error) ? error.join(', ') : error}</p>}

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white rounded bg-primary disabled:bg-gray-400">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}