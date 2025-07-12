// frontend/src/app/reports/[id]/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import ExpenseTable from '@/components/ExpenseTable';
import { Download, Edit, Trash2, Send, Check, X, Loader2 } from 'lucide-react';
import SubmitReportModal from '@/components/SubmitReportModal';
import { useToastStore } from '@/lib/toastStore';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';

// Interfaces for data shapes
interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  vat_applied: boolean;
  vat_amount: number;
  receipt_blob_id: string | null;
}

interface Report {
  id: string;
  name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
}

export default function ReportDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const token = useAuthStore((state) => state.token);
    const showToast = useToastStore((state) => state.showToast);

    const [report, setReport] = useState<Report | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitModalOpen, setSubmitModalOpen] = useState(false);
    
    // State for PDF preview
    const [isPdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const fetchReportDetails = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const reportResponse = await api.get(`/expense-report/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReport(reportResponse.data);
            setExpenses(reportResponse.data.expenses);
        } catch (error) {
            console.error('Failed to fetch report details:', error);
            showToast('Failed to load report details.', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, token, showToast]);

    useEffect(() => {
        fetchReportDetails();
    }, [fetchReportDetails]);

    const handlePreviewPdf = async () => {
        try {
            const response = await api.get(`/expense-report/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setPdfUrl(fileURL);
            setPdfPreviewOpen(true);
        } catch (error) {
            showToast('Failed to generate PDF preview.', 'error');
            console.error('PDF generation error:', error);
        }
    };

    const handleClosePdfPreview = () => {
        if(pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }
        setPdfPreviewOpen(false);
        setPdfUrl('');
    };

    const handleDeleteReport = async () => {
        if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            try {
                await api.delete(`/expense-report/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                showToast('Report deleted successfully.', 'success');
                router.push('/reports');
            } catch (error) {
                showToast('Failed to delete report.', 'error');
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!report) {
        return <div className="text-center text-red-500">Report not found.</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{report.name}</h1>
                    <p className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${
                        report.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        report.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        report.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {report.status}
                    </p>
                    {report.status === 'REJECTED' && (
                        <p className="text-sm text-red-600 mt-2">Reason: {report.rejectionReason}</p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button onClick={handlePreviewPdf} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <Download className="w-4 h-4 mr-2" />
                        Preview PDF
                    </button>
                    {report.status === 'DRAFT' && (
                        <>
                            <button onClick={() => router.push(`/reports/${id}/edit`)} className="flex items-center px-4 py-2 text-sm font-medium bg-gray-200 rounded-md hover:bg-gray-300">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </button>
                            <button onClick={() => setSubmitModalOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                                <Send className="w-4 h-4 mr-2" />
                                Submit
                            </button>
                            <button onClick={handleDeleteReport} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold">Expenses</h2>
                <ExpenseTable expenses={expenses} onEdit={() => {}} onDelete={() => {}} />
            </div>

            {isSubmitModalOpen && (
                <SubmitReportModal
                    reportId={id as string}
                    onClose={() => setSubmitModalOpen(false)}
                    onSubmitted={fetchReportDetails}
                />
            )}

            <ReceiptPreviewModal
                isOpen={isPdfPreviewOpen}
                onClose={handleClosePdfPreview}
                previewUrl={pdfUrl}
                mimeType="application/pdf"
            />
        </div>
    );
}
