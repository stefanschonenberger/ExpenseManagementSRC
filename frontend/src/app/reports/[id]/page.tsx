// ==========================================================
// File: src/app/reports/[id]/page.tsx
// Update this file to trigger toasts on submission.
// ==========================================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Send, ArrowLeft, Eye, Check } from 'lucide-react';
import SubmitReportModal from '@/components/SubmitReportModal';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useToastStore } from '@/lib/toastStore'; // Import the toast store

interface Expense {
  id: string; title: string; amount: number; expense_date: string; currency_code: string; supplier: string | null; vat_amount: number; receipt_blob_id: string | null; book: boolean; expense_type: string;
}
interface ReportDetails {
  id: string; title: string; total_amount: number; status: string; expenses: Expense[]; rejection_reason: string | null;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: reportId } = params;
  const token = useAuthStore((state) => state.token);
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitModalOpen, setSubmitModalOpen] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const fetchReport = useCallback(async () => {
    if (!token || !reportId) return;
    try {
      setLoading(true);
      const response = await api.get(`/expense-report/${reportId}`, { headers: { Authorization: `Bearer ${token}` } });
      setReport(response.data);
    } catch (err) {
      setError("Failed to fetch report.");
    } finally {
      setLoading(false);
    }
  }, [token, reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSubmitReport = async (managerId: string) => {
    try {
      await api.post(`/expense-report/${reportId}/submit`, { manager_id: managerId }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Report submitted for approval.', 'success');
      setSubmitModalOpen(false);
      router.push('/reports');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report.');
      showToast('Failed to submit report.', 'error');
    }
  };

  const handleViewReceipt = async (blobId: string) => {
    try {
      const response = await api.get(`/blob/${blobId}`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const fileURL = URL.createObjectURL(response.data);
      window.open(fileURL, '_blank');
    } catch (err) {
      setError("Could not load the receipt file.");
    }
  };

  if (loading) return <p>Loading report...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!report) return <p>Report not found.</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
            <Link href="/reports" className="flex items-center mb-2 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1"/>
                Back to My Reports
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">{report.title}</h1>
        </div>
        {report.status === 'DRAFT' && (
          <button onClick={() => setSubmitModalOpen(true)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md bg-primary hover:bg-primary-hover">
            <Send className="w-5 h-5 mr-2" />
            Submit for Approval
          </button>
        )}
      </div>
      
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Type</th>
                    <th className="w-12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Book</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">VAT</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {report.expenses.map(exp => (
                    <tr key={exp.id}>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(exp.expense_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{exp.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{exp.expense_type}</td>
                        <td className="px-6 py-4 text-center">{exp.book && <Check className="w-5 h-5 mx-auto text-success" />}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{exp.supplier}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{exp.vat_amount > 0 ? formatCurrency(exp.vat_amount) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                            {exp.receipt_blob_id && (
                                <button onClick={() => handleViewReceipt(exp.receipt_blob_id!)} className="text-primary hover:text-primary-hover" title="View Receipt">
                                    <Eye className="w-5 h-5" />
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-50">
                <tr>
                    <td colSpan={7} className="px-6 py-3 text-sm font-semibold text-right text-gray-900">Total</td>
                    <td className="px-6 py-3 text-sm font-semibold text-right text-gray-900">{formatCurrency(report.total_amount)}</td>
                </tr>
            </tfoot>
        </table>
      </div>
      
      {report.rejection_reason && (
        <div className="p-4 mt-6 text-red-700 bg-red-100 border-l-4 border-red-500" role="alert">
            <p className="font-bold">This report was rejected: <span className="font-normal">{report.rejection_reason}</span></p>
        </div>
      )}
      
      {isSubmitModalOpen && <SubmitReportModal onClose={() => setSubmitModalOpen(false)} onSubmit={handleSubmitReport} />}
    </div>
  );
}