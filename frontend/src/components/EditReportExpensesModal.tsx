// frontend/src/components/EditReportExpensesModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X, Save, Loader2 } from 'lucide-react';
import { useToastStore } from '@/lib/toastStore';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  title: string;
  amount: number;
  supplier: string | null;
  expense_date: string;
}

interface EditReportExpensesModalProps {
  reportId: string;
  currentExpenses: Expense[];
  onClose: () => void;
  onReportUpdated: () => void;
}

export default function EditReportExpensesModal({
  reportId,
  currentExpenses,
  onClose,
  onReportUpdated,
}: EditReportExpensesModalProps) {
  const [availableExpenses, setAvailableExpenses] = useState<Expense[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    // Set initial selection from the expenses already in the report
    setSelectedExpenseIds(currentExpenses.map(exp => exp.id));

    const fetchDraftExpenses = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const response = await api.get('/expense', { headers: { Authorization: `Bearer ${token}` } });
        const drafts = response.data.filter((exp: any) => exp.status === 'DRAFT');
        setAvailableExpenses(drafts);
      } catch (err) {
        showToast('Could not load available draft expenses.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDraftExpenses();
  }, [currentExpenses, token, showToast]);

  const combinedExpenses = useMemo(() => {
    const expenseMap = new Map<string, Expense>();
    // Add current expenses first to maintain their presence
    currentExpenses.forEach(exp => expenseMap.set(exp.id, exp));
    // Add available drafts that aren't already in the report
    availableExpenses.forEach(exp => {
      if (!expenseMap.has(exp.id)) {
        expenseMap.set(exp.id, exp);
      }
    });
    // Sort the combined list by date to ensure a stable render order
    return Array.from(expenseMap.values()).sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
  }, [currentExpenses, availableExpenses]);

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenseIds(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.patch(
        `/expense-report/${reportId}`,
        { expense_ids: selectedExpenseIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Report expenses updated successfully!', 'success');
      onReportUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Report Expenses</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Expenses for this Report</h3>
            <div className="mt-2 border rounded-md">
              <div className="flex px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                <div className="w-1/12"></div>
                <div className="w-2/12">Date</div>
                <div className="w-3/12">Title</div>
                <div className="w-3/12">Supplier</div>
                <div className="w-3/12 text-right">Amount</div>
              </div>
              <div className="overflow-y-auto max-h-60">
                {isLoading ? (
                  <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : combinedExpenses.length > 0 ? (
                  combinedExpenses.map(expense => (
                    <div 
                      key={expense.id}
                      className="flex items-center px-4 py-2 border-t hover:bg-gray-50"
                    >
                      <div className="w-1/12">
                        <input
                          type="checkbox"
                          id={`expense-checkbox-${expense.id}`}
                          checked={selectedExpenseIds.includes(expense.id)}
                          onChange={() => handleSelectExpense(expense.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <label 
                        htmlFor={`expense-checkbox-${expense.id}`}
                        className="flex items-center justify-between flex-1 ml-3 text-sm cursor-pointer"
                      >
                        <div className="w-2/12 text-gray-600">{formatDate(expense.expense_date)}</div>
                        <div className="w-3/12 font-medium text-gray-800">{expense.title}</div>
                        <div className="w-3/12 text-gray-600">{expense.supplier || 'N/A'}</div>
                        <div className="w-3/12 text-right text-gray-800">{formatCurrency(expense.amount)}</div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm text-center text-gray-500">No available expenses found.</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400">
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
