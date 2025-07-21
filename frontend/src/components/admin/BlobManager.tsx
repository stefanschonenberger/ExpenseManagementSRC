// frontend/src/components/admin/BlobManager.tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Trash2, Loader2 } from 'lucide-react';
import { useToastStore } from '@/lib/toastStore';

export default function BlobManager() {
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore(state => state.token);
    const showToast = useToastStore(state => state.showToast);

    const handleCleanup = async () => {
        if (!window.confirm("Are you sure you want to permanently delete all orphaned files? This action cannot be undone.")) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/admin/blobs/cleanup', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { deletedCount } = response.data;
            showToast(`Successfully purged ${deletedCount} orphaned file(s).`, 'success');
        } catch (error) {
            console.error("Failed to cleanup orphaned blobs", error);
            showToast("Failed to run the cleanup process.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Blob Storage Maintenance</h2>
            <p className="mb-4 text-sm text-gray-600">
                This action will scan the blob storage and permanently delete any files (receipts, images) that are not attached to an expense.
            </p>
            <button
                onClick={handleCleanup}
                disabled={isLoading}
                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-danger hover:bg-danger-hover disabled:bg-gray-400"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Purging...
                    </>
                ) : (
                    <>
                        <Trash2 className="w-5 h-5 mr-2" />
                        Purge Orphaned Files
                    </>
                )}
            </button>
        </div>
    );
}