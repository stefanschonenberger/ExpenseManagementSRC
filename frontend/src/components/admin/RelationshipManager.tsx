// src/components/admin/RelationshipManager.tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowRight, Trash2, UserPlus } from 'lucide-react';

export default function RelationshipManager({ users, relationships, onDataChange }: any) {
    const [employeeId, setEmployeeId] = useState('');
    const [managerId, setManagerId] = useState('');
    const [error, setError] = useState<string|null>(null);
    const token = useAuthStore(state => state.token);

    const handleCreate = async () => {
        if (!employeeId || !managerId) return;
        setError(null);
        try {
            await api.post('/admin/relationships', { employeeId, managerId }, { headers: { Authorization: `Bearer ${token}` } });
            onDataChange();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create relationship.');
        }
    };
    
    const handleDelete = async (rel: any) => {
        if (!rel.employee || !rel.manager) return;
        try {
            await api.delete(`/admin/relationships/${rel.employee.id}/${rel.manager.id}`, { headers: { Authorization: `Bearer ${token}` } });
            onDataChange();
        } catch(err) {
            setError('Failed to delete relationship.');
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Reporting Structure</h2>
            <div className="p-4 mb-6 border rounded-md bg-gray-50">
                <h3 className="mb-2 font-semibold text-gray-700">Add New Relationship</h3>
                <div className="flex items-center space-x-4">
                    <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="flex-1 w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Select Employee...</option>
                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <ArrowRight className="text-gray-500" />
                    <select value={managerId} onChange={e => setManagerId(e.target.value)} className="flex-1 w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Select Manager...</option>
                        {users.filter((u: any) => u.id !== employeeId).map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <button onClick={handleCreate} className="p-2 text-white rounded-md bg-primary hover:bg-primary-hover"><UserPlus /></button>
                </div>
                {error && <p className="mt-2 text-sm text-center text-danger">{error}</p>}
            </div>
            <div className="space-y-2">
                {relationships.map((rel: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        {rel.employee && rel.manager ? (
                            <>
                                <div className="flex items-center space-x-2">
                                    <span>{rel.employee.full_name}</span><span className="text-sm text-gray-500">reports to</span><span>{rel.manager.full_name}</span>
                                </div>
                                <button onClick={() => handleDelete(rel)}><Trash2 className="w-4 h-4 text-danger"/></button>
                            </>
                        ) : (<span className="text-sm text-danger">Incomplete relationship data.</span>)}
                    </div>
                ))}
            </div>
        </div>
    );
}