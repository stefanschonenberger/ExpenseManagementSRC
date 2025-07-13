// frontend/src/app/reports/[id]/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import ExpenseTable from '@/components/ExpenseTable';
import { Download, Edit, Trash2, Send, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import SubmitReportModal from '@/components/SubmitReportModal';
import { useToastStore } from '@/lib/toastStore';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';
import EditReportExpensesModal from '@/components/EditReportExpensesModal';
import Link from 'next/link';
import { Expense, Report } from '@/types'; // Import the canonical types

export default function ReportDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const token = useAuthStore((state) => state.token);
    const showToast = useToastStore((state) => state.showToast);

    const [report, setReport] = useState<Report | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitModalOpen, setSubmitModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    
    const [isPdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const isRejected = report?.status === 'DRAFT' && report?.rejection_reason;

    const fetchReportDetails = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const reportResponse = await api.get(`/expense-report/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReport(reportResponse.data);
            setExpenses(reportResponse.data.expenses || []);
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
    
    const handleReportUpdated = () => {
        setEditModalOpen(false);
        fetchReportDetails();
    };

    const handleReportSubmitted = () => {
        setSubmitModalOpen(false);
        fetchReportDetails();
    };

    const handlePreviewPdf = async () => {
        setIsGeneratingPdf(true);
        showToast('Generating your PDF... please wait.', 'info');
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
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleClosePdfPreview = () => {
        if(pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfPreviewOpen(false);
        setPdfUrl('');
    };

    const handleDeleteReport = async () => {
        if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            try {
                await api.delete(`/expense-report/${id}`, { headers: { Authorization: `Bearer ${token}` } });
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
                    <Link href="/reports" className="flex items-center mb-2 text-sm text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-4 h-4 mr-1"/>
                        Back to Reports
                    </Link>
                    <h1 className="text-2xl font-bold">{report.title}</h1>
                    <p className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${
                        isRejected ? 'bg-red-100 text-red-800' :
                        report.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        report.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {isRejected ? 'REJECTED' : report.status}
                    </p>
                </div>
                <div className="flex space-x-2">
                    {report.status === 'APPROVED' && (
                        <button onClick={handlePreviewPdf} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400" disabled={isGeneratingPdf}>
                            {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            {isGeneratingPdf ? 'Generating...' : 'Preview PDF'}
                        </button>
                    )}
                    {report.status === 'DRAFT' && (
                        <>
                            <button onClick={() => setEditModalOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium bg-gray-200 rounded-md hover:bg-gray-300">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Expenses
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

            {isRejected && (
                <div className="p-4 mb-6 text-red-800 bg-red-100 border-l-4 border-red-500 rounded-md">
                    <div className="flex">
                        <div className="py-1"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                        <div className="ml-3">
                            <p className="text-sm font-bold">Rejection Reason</p>
                            <p className="mt-1 text-sm">{report.rejection_reason}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8">
                <h2 className="text-xl font-semibold">Expenses</h2>
                <ExpenseTable expenses={expenses} onEdit={() => {}} onDelete={() => {}} actionsEnabled={false} />
            </div>

            {isSubmitModalOpen && (
                <SubmitReportModal reportId={id as string} onClose={() => setSubmitModalOpen(false)} onSubmitted={handleReportSubmitted} />
            )}
            
            {isEditModalOpen && (
                <EditReportExpensesModal reportId={report.id} currentExpenses={expenses} onClose={() => setEditModalOpen(false)} onReportUpdated={handleReportUpdated} />
            )}

            <ReceiptPreviewModal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} previewUrl={pdfUrl} mimeType="application/pdf" />
        </div>
    );
}
