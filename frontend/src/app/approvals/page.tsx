// src/app/approvals/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Import the utility

interface PendingReport {
  id: string;
  title: string;
  submitted_at: string;
  total_amount: number;
  user: {
    full_name: string;
  };
}

export default function ApprovalsPage() {
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  const fetchPendingReports = useCallback(async () => {
    if (!token) {
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      const response = await api.get('/expense-report/approvals/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data);
    } catch (err) {
      setError('Failed to fetch pending reports.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingReports();
  }, [fetchPendingReports]);

  if (loading) return <p>Loading pending approvals...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pending Approvals</h1>
      </div>

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Report Title</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Submitted By</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Submitted On</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm text-center text-gray-500">No reports awaiting your approval.</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                      <tr key={report.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{report.user.full_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(report.submitted_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(report.total_amount)}</td>
                          <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                            <Link href={`/approvals/${report.id}`} className="text-primary hover:text-primary-hover" title="View Report">
                                <Eye className="inline-block w-5 h-5" />
                            </Link>
                          </td>
                      </tr>
                  ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}