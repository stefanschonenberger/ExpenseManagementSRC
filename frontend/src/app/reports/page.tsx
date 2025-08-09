// src/app/reports/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PlusCircle, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import CreateReportModal from '@/components/CreateReportModal';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useToastStore } from '@/lib/toastStore';

interface Report {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  rejection_reason: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null); // Track which PDF is being generated
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  const fetchReports = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      const response = await api.get('/expense-report', { headers: { Authorization: `Bearer ${token}` } });
      // Sort reports by creation date, newest first
      const sortedReports = response.data.sort((a: Report, b: Report) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReports(sortedReports);
    } catch (err) {
      setError('Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  
  const handleReportAdded = () => {
    fetchReports();
    setIsModalOpen(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this draft report?')) {
        try {
            await api.delete(`/expense-report/${reportId}`, { headers: { Authorization: `Bearer ${token}` } });
            showToast('Report deleted.', 'success');
            fetchReports();
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to delete the report.", 'error');
        }
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    setGeneratingPdfId(reportId);
    try {
      showToast('Generating your PDF... please wait.', 'info');
      const response = await api.get(`/expense-report/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Opiatech-Report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Failed to download the report PDF.", "error");
      console.error(err);
    } finally {
        setGeneratingPdfId(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
              <tr key={report.id} className={report.status === 'REJECTED' ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{report.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(report.created_at)}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(report.total_amount)}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      report.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                  }`}>
                    {report.status}
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
                  {(report.status === 'APPROVED' || report.status === 'DRAFT' || report.status === 'SUBMITTED') && (
                    <button 
                        onClick={() => handleDownloadReport(report.id)} 
                        className="text-success hover:text-green-700 disabled:text-gray-400" 
                        title="Download PDF"
                        disabled={generatingPdfId === report.id}
                    >
                        {generatingPdfId === report.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
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