// frontend/src/components/ExpenseTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { Trash2, Edit, Paperclip } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import { formatCurrency } from '@/lib/utils';
import { Expense } from '@/types'; // Import the canonical Expense type

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  actionsEnabled: boolean;
}

export default function ExpenseTable({ expenses, onEdit, onDelete, actionsEnabled }: ExpenseTableProps) {
  const token = useAuthStore((state) => state.token);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');

  const handlePreview = async (expense: Expense) => {
    if (!expense.receipt_blob_id) return;
    try {
        const response = await api.get(`/blob/${expense.receipt_blob_id}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });
        const blob = response.data;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewMimeType(blob.type);
        setPreviewOpen(true);
    } catch (error) {
        console.error("Failed to fetch receipt for preview", error);
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

  const formatDate = (dateString: string) => {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
  }, [expenses]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Title</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Supplier</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Book Amount</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">VAT</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Receipt</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedExpenses.map((expense) => (
            <tr key={expense.id}>
              <td className="px-6 py-4 whitespace-nowrap">{formatDate(expense.expense_date)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{expense.title}</td>
              <td className="px-6 py-4 whitespace-nowrap">{expense.supplier || 'N/A'}</td>
              <td className="px-6 py-4 text-right whitespace-nowrap">{formatCurrency(expense.amount)}</td>
              <td className="px-6 py-4 text-right whitespace-nowrap">{expense.book ? formatCurrency(expense.book_amount) : '-'}</td>
              <td className="px-6 py-4 text-right whitespace-nowrap">{formatCurrency(expense.vat_amount)}</td>
              <td className="px-6 py-4 text-center whitespace-nowrap">
                {expense.receipt_blob_id && (
                  <button onClick={() => handlePreview(expense)} title="Preview Receipt">
                    <Paperclip className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                  </button>
                )}
              </td>
              <td className="px-6 py-4 text-center whitespace-nowrap">
                <button 
                  onClick={() => onEdit(expense)} 
                  className="text-blue-600 hover:text-blue-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  disabled={!actionsEnabled}
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => onDelete(expense.id)} 
                  className="ml-4 text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  disabled={!actionsEnabled}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReceiptPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        previewUrl={previewUrl}
        mimeType={previewMimeType}
      />
    </div>
  );
}
