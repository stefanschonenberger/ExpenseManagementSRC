// src/components/admin/SettingsManager.tsx
'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSettingsStore } from '@/lib/settingsStore'; // Import the settings store
import { X } from 'lucide-react';

export default function SettingsManager({ settings, onDataChange }: any) {
    const [vatRate, setVatRate] = useState(0);
    const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
    const [newType, setNewType] = useState('');
    const [timeoutMinutes, setTimeoutMinutes] = useState(30);
    const token = useAuthStore(state => state.token);
    const fetchSettings = useSettingsStore(state => state.fetchSettings); // Get the fetch function from the store

    useEffect(() => {
        if (settings) {
            setVatRate(settings.vat_rate * 100);
            setExpenseTypes(settings.expense_types || []);
            setTimeoutMinutes(settings.inactivity_timeout_minutes || 30);
        }
    }, [settings]);

    const handleSaveSettings = async () => {
        try {
            await api.put('/admin/settings', {
                vat_rate: vatRate / 100,
                expense_types: expenseTypes,
                inactivity_timeout_minutes: timeoutMinutes,
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            // FIX: After saving, explicitly tell the global stores to refetch the data.
            onDataChange(); // Refreshes the admin page data
            fetchSettings(); // Refreshes the global settings for the timeout hook
            
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings.");
        }
    };
    
    const handleAddType = () => {
        if (newType && !expenseTypes.includes(newType)) {
            setExpenseTypes([...expenseTypes, newType]);
            setNewType('');
        }
    };

    const handleRemoveType = (typeToRemove: string) => {
        setExpenseTypes(expenseTypes.filter(type => type !== typeToRemove));
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">System Settings</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">VAT Rate (%)</label>
                    <input type="number" value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Inactivity Timeout (minutes)</label>
                    <input type="number" value={timeoutMinutes} onChange={e => setTimeoutMinutes(parseInt(e.target.value, 10))} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Expense Types</label>
                    <div className="space-y-2">
                        {expenseTypes.map(type => (
                            <div key={type} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                <span>{type}</span>
                                <button onClick={() => handleRemoveType(type)}><X className="w-4 h-4 text-gray-500"/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex mt-2 space-x-2">
                        <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="New type name" className="flex-1 w-full p-2 border rounded" />
                        <button onClick={handleAddType} className="px-3 py-1 text-white rounded bg-primary">Add</button>
                    </div>
                </div>
                <button onClick={handleSaveSettings} className="w-full px-4 py-2 mt-4 text-white rounded bg-success">Save Settings</button>
            </div>
        </div>
    );
}