// src/components/CreateReportModal.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { X } from 'lucide-react';

// Define types for the modal's props and the expense data
interface CreateReportModalProps {
  onClose: () => void;
  onReportAdded: () => void;
}

interface DraftExpense {
    id: string;
    title: string;
    amount: number;
    currency_code: string;
}

export default function CreateReportModal({ onClose, onReportAdded }: CreateReportModalProps) {
  const [title, setTitle] = useState('');
  const [draftExpenses, setDraftExpenses] = useState<DraftExpense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  // Fetch draft expenses when the modal opens
  useEffect(() => {
    const fetchDraftExpenses = async () => {
      if (!token) return;
      try {
        const response = await api.get('/expense', {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Filter for expenses that are in DRAFT status
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl">
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
            <div className="mt-2 space-y-2 overflow-y-auto max-h-60">
              {draftExpenses.length > 0 ? draftExpenses.map(expense => (
                <div key={expense.id} className="flex items-center p-2 border rounded-md">
                  <input 
                    type="checkbox" 
                    id={`expense-${expense.id}`}
                    checked={selectedExpenses.includes(expense.id)}
                    onChange={() => handleSelectExpense(expense.id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor={`expense-${expense.id}`} className="flex justify-between flex-1 ml-3 text-sm">
                    <span className="font-medium text-gray-800">{expense.title}</span>
                    <span className="text-gray-500">{(expense.amount / 100).toFixed(2)} {expense.currency_code}</span>
                  </label>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No draft expenses available to add.</p>
              )}
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