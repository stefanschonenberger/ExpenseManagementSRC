// frontend/src/app/approvals/[id]/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckCircle, XCircle, Eye, ArrowLeft, Check } from 'lucide-react';
import RejectReportModal from '@/components/RejectReportModal'; 
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useToastStore } from '@/lib/toastStore';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';

interface Expense {
  id: string; 
  title: string; 
  amount: number; 
  vat_amount: number; 
  expense_date: string; 
  currency_code: string; 
  supplier: string | null; 
  receipt_blob_id: string | null; 
  book: boolean; 
  book_amount: number;
  expense_type: string;
}

interface ReportDetails {
  id: string; 
  title: string; 
  total_amount: number; 
  status: string; 
  user: { full_name: string }; 
  expenses: Expense[];
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: reportId } = params;
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');

  const fetchReportDetails = useCallback(async () => {
    if (!token || !reportId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/expense-report/approval/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(response.data);
    } catch (err) {
      setError('Failed to fetch report details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, reportId]);

  useEffect(() => {
    fetchReportDetails();
  }, [fetchReportDetails]);

  const handleApprove = async () => {
    if (!token || !reportId) return;
    try {
      await api.post(`/expense-report/${reportId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Report approved successfully!', 'success');
      router.push('/approvals');
    } catch (err) {
      showToast('Failed to approve report.', 'error');
      console.error(err);
    }
  };

  const handleReject = async (reason: string) => {
    if (!token || !reportId) return;
    try {
      await api.post(`/expense-report/${reportId}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Report rejected successfully!', 'success');
      router.push('/approvals');
    } catch (err) {
      showToast('Failed to reject report.', 'error');
      console.error(err);
    }
  };

  const handleViewReceipt = async (blobId: string) => {
    if (!token) return;
    try {
      const response = await api.get(`/blob/${blobId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setPreviewMimeType(blob.type);
      setPreviewOpen(true);

    } catch (error) {
      console.error('Error fetching receipt:', error);
      showToast('Could not display receipt.', 'error');
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewUrl('');
    setPreviewMimeType('');
  };

  if (loading) return <p>Loading report details...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!report) return <p>Report not found.</p>;

  return (
    <div>
        <div className="flex items-start justify-between mb-6">
            <div>
                <Link href="/approvals" className="flex items-center mb-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4 mr-1"/>Back to Approvals</Link>
                <h1 className="text-2xl font-semibold text-gray-900">{report.title}</h1>
                <p className="text-sm text-gray-500">Submitted by: {report.user.full_name}</p>
            </div>
            {report.status === 'SUBMITTED' && (
                <div className="flex space-x-2">
                    <button onClick={() => setRejectModalOpen(true)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-md hover:bg-danger-hover"><XCircle className="w-5 h-5 mr-2" />Reject</button>
                    <button onClick={handleApprove} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md bg-success hover:bg-success-hover"><CheckCircle className="w-5 h-5 mr-2" />Approve</button>
                </div>
            )}
        </div>
        <div className="overflow-hidden bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Book Amount</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">VAT</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Total</th>
                        <th className="w-12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Book</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {report.expenses.map((expense) => (
                        <tr key={expense.id}>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{expense.supplier}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{expense.title}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{expense.expense_type}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{expense.book && typeof expense.book_amount === 'number' ? formatCurrency(expense.book_amount) : '-'}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{expense.vat_amount > 0 ? formatCurrency(expense.vat_amount) : '-'}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                            <td className="px-6 py-4 text-center">{expense.book && <Check className="w-5 h-5 mx-auto text-success" />}</td>
                            <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{expense.receipt_blob_id && (<button onClick={() => handleViewReceipt(expense.receipt_blob_id!)} className="text-primary hover:text-primary-hover" title="View Receipt"><Eye className="w-5 h-5" /></button>)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50">
                    <tr><td colSpan={8} className="px-6 py-3 text-sm font-semibold text-right text-gray-900">Total</td><td className="px-6 py-3 text-sm font-semibold text-right text-gray-900">{formatCurrency(report.total_amount)}</td></tr>
                </tfoot>
            </table>
        </div>
        {isRejectModalOpen && <RejectReportModal onClose={() => setRejectModalOpen(false)} onReject={handleReject} />}
        
        <ReceiptPreviewModal
            isOpen={isPreviewOpen}
            onClose={handleClosePreview}
            previewUrl={previewUrl}
            mimeType={previewMimeType}
        />
    </div>
  );
}