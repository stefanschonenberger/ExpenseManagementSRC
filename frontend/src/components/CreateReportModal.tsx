// frontend/src/components/CreateReportModal.tsx

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CreateReportModalProps {
  onClose: () => void;
  onReportAdded: () => void;
}

interface DraftExpense {
    id: string;
    title: string;
    amount: number;
    supplier: string | null;
    expense_date: string;
    expense_type: string; // Added the missing property
}

export default function CreateReportModal({ onClose, onReportAdded }: CreateReportModalProps) {
  const [title, setTitle] = useState('');
  const [draftExpenses, setDraftExpenses] = useState<DraftExpense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchDraftExpenses = async () => {
      if (!token) return;
      try {
        const response = await api.get('/expense', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const drafts = response.data.filter((exp: any) => exp.status === 'DRAFT');
        setDraftExpenses(drafts);
      } catch (err) {
        setError('Could not load draft expenses.');
        console.error(err);
      }
    };
    fetchDraftExpenses();
  }, [token]);
  
  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses(prev => 
        prev.includes(expenseId) 
            ? prev.filter(id => id !== expenseId) 
            : [...prev, expenseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (selectedExpenses.length === 0) {
        setError("Please select at least one expense.");
        return;
    }

    try {
      await api.post('/expense-report', {
        title,
        expense_ids: selectedExpenses,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onReportAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create report.');
      console.error(err);
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
          <h2 className="text-xl font-semibold text-gray-900">Create New Report</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Report Title</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">Available Draft Expenses</h3>
            <div className="mt-2 border rounded-md">
                <div className="flex px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    <div className="w-1/12"></div>
                    <div className="w-3/12">Supplier</div>
                    <div className="w-4/12">Description</div>
                    <div className="w-2/12">Category</div>
                    <div className="w-2/12 text-right">Amount</div>
                </div>
                <div className="overflow-y-auto max-h-60">
                  {draftExpenses.length > 0 ? draftExpenses.map(expense => (
                    <div key={expense.id} className="flex items-center px-4 py-2 border-t">
                      <div className="w-1/12">
                        <input 
                          type="checkbox" 
                          id={`expense-${expense.id}`}
                          checked={selectedExpenses.includes(expense.id)}
                          onChange={() => handleSelectExpense(expense.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <label htmlFor={`expense-${expense.id}`} className="flex items-center justify-between flex-1 ml-3 text-sm cursor-pointer">
                        <div className="w-3/12 text-gray-600">{expense.supplier || 'N/A'}</div>
                        <div className="w-4/12 font-medium text-gray-800">{expense.title}</div>
                        <div className="w-2/12 text-gray-600">{expense.expense_type}</div>
                        <div className="w-2/12 text-right text-gray-800">{formatCurrency(expense.amount)}</div>
                      </label>
                    </div>
                  )) : (
                    <p className="p-4 text-sm text-center text-gray-500">No draft expenses available to add.</p>
                  )}
                </div>
            </div>
          </div>

          {error && <p className="text-sm text-center text-danger">{error}</p>}
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover">Create Report</button>
          </div>
        </form>
      </div>
    </div>
  );
}