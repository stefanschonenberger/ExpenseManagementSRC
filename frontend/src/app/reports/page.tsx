// src/app/reports/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PlusCircle, Trash2, Eye, AlertCircle } from 'lucide-react'; // Add AlertCircle
import CreateReportModal from '@/components/CreateReportModal';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface Report {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  rejection_reason: string | null; // Add rejection reason
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token = useAuthStore((state) => state.token);

  const fetchReports = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/expense-report', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data);
    } catch (err) {
      setError('Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);
  
  const handleReportAdded = () => {
    fetchReports();
    setIsModalOpen(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await api.delete(`/expense-report/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete the report.");
    }
  };

  if (loading) return <p>Loading reports...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Reports</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover"
        >
          <PlusCircle className="w-5 h-5 mr-2 -ml-1" />
          Create Report
        </button>
      </div>

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Created On</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id} className={report.rejection_reason ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{report.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(report.total_amount)}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.rejection_reason ? 'bg-red-100 text-red-800' :
                      report.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                  }`}>
                    {report.rejection_reason ? 'REJECTED' : report.status}
                  </span>
                </td>
                <td className="flex items-center justify-end px-6 py-4 space-x-4 text-sm text-right whitespace-nowrap">
                  <Link href={`/reports/${report.id}`} className="text-primary hover:text-primary-hover" title="View Report">
                    <Eye className="w-5 h-5" />
                  </Link>
                  {report.status === 'DRAFT' && (
                    <button onClick={() => handleDeleteReport(report.id)} className="text-danger hover:text-red-700" title="Delete Report">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && <CreateReportModal onClose={() => setIsModalOpen(false)} onReportAdded={handleReportAdded} />}
    </div>
  );
}