// ==========================================================
// File: src/app/approvals/[id]/page.tsx
// Update this file to trigger toasts on approve/reject.
// ==========================================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckCircle, XCircle, Eye, ArrowLeft, Check } from 'lucide-react';
import RejectReportModal from '@/components/RejectReportModal'; 
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useToastStore } from '@/lib/toastStore'; // Import the toast store

interface Expense {
  id: string; title: string; amount: number; vat_amount: number; expense_date: string; currency_code: string; supplier: string | null; receipt_blob_id: string | null; book: boolean; expense_type: string;
}
interface ReportDetails {
  id: string; title: string; total_amount: number; status: string; user: { full_name: string }; expenses: Expense[];
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

  const fetchReportDetails = useCallback(async () => {
    if (!token || !reportId) return;
    try {
      setLoading(true);
      const response = await api.get(`/expense-report/approval/${reportId}`, { headers: { Authorization: `Bearer ${token}` } });
      setReport(response.data);
    } catch (err) {
      setError('Failed to fetch report details.');
    } finally {
      setLoading(false);
    }
  }, [token, reportId]);

  useEffect(() => {
    fetchReportDetails();
  }, [fetchReportDetails]);

  const handleApprove = async () => {
    try {
        await api.post(`/expense-report/${reportId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
        showToast('Report approved and notification sent.', 'success');
        router.push('/approvals');
    } catch(err) {
        setError('Failed to approve report.');
        showToast('Failed to approve report.', 'error');
    }
  };

  const handleReject = async (reason: string) => {
    try {
        await api.post(`/expense-report/${reportId}/reject`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
        showToast('Report rejected and notification sent.', 'info');
        setRejectModalOpen(false);
        router.push('/approvals');
    } catch(err) {
        setError('Failed to reject report.');
        showToast('Failed to reject report.', 'error');
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

  if (loading) return <p>Loading report details...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!report) return <p>Report not found.</p>;

  return (
    <div>
      {/* ... (rest of the component JSX is unchanged) ... */}
    </div>
  );
}