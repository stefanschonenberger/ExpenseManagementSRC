// src/app/admin/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import UserManagement from '@/components/admin/UserManagement';
import RelationshipManager from '@/components/admin/RelationshipManager';
import SettingsManager from '@/components/admin/SettingsManager';

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAuthStore((state) => state.token);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [usersRes, relsRes, settingsRes] = await Promise.all([
                api.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/admin/relationships', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(usersRes.data);
            setRelationships(relsRes.data);
            setSettings(settingsRes.data);
        } catch (err) {
            setError("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <p>Loading Admin Data...</p>;
    if (error) return <p className="text-danger">{error}</p>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <div className="space-y-8 xl:col-span-2">
                    <UserManagement users={users} onDataChange={fetchData} />
                    <RelationshipManager users={users} relationships={relationships} onDataChange={fetchData} />
                </div>
                <div className="xl:col-span-1">
                    {settings && <SettingsManager settings={settings} onDataChange={fetchData} />}
                </div>
            </div>
        </div>
    );
}