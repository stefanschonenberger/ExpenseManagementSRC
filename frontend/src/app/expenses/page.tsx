// src/app/expenses/page.tsx
'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { PlusCircle } from 'lucide-react';
import AddExpenseModal from '@/components/AddExpenseModal';
import { useAuthStore } from '@/lib/store';
import Tabs from '@/components/ui/Tabs';
import ExpenseTable from '@/components/ExpenseTable';

// The full interface for an expense object
interface Expense {
  id: string;
  title: string;
  amount: number;
  vat_amount: number;
  expense_date: string;
  status: string;
  currency_code: string;
  receipt_blob_id: string | null;
  supplier: string | null;
  vat_applied: boolean;
  expense_type: string;
  book: boolean; // Add the 'book' property here
}

export default function ExpensesPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState('Drafts');
  
  const token = useAuthStore((state) => state.token);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
        const [expensesRes, settingsRes] = await Promise.all([
            api.get('/expense', { headers: { Authorization: `Bearer ${token}` } }),
            api.get('/settings')
        ]);
        setAllExpenses(expensesRes.data);
        setExpenseTypes(settingsRes.data.expenseTypes);
    } catch (err) {
        setError('Failed to fetch data.');
    } finally {
        setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredExpenses = useMemo(() => {
    const statusMap: { [key: string]: string } = {
        'Drafts': 'DRAFT',
        'Submitted': 'SUBMITTED',
        'Approved': 'COMPLETED',
    };
    const targetStatus = statusMap[activeTab];
    return allExpenses
      .filter(exp => exp.status === targetStatus)
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }, [allExpenses, activeTab]);
  
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  
  const handleExpenseSaved = () => {
    handleModalClose();
    fetchData();
  };
  
  const handleEditClick = (expense: any) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  
  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.delete(`/expense/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete the expense.");
    }
  };
  
  const handleViewReceipt = async (blobId: string) => {
    try {
      const response = await api.get(`/blob/${blobId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const fileURL = URL.createObjectURL(response.data);
      window.open(fileURL, '_blank');
    } catch (err) {
      setError("Could not load the receipt file.");
    }
  };

  if (loading) return <p>Loading expenses...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">My Expenses</h1>
        {activeTab === 'Drafts' && (
          <button
            onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover"
          >
            <PlusCircle className="w-5 h-5 mr-2 -ml-1" />
            Add Expense
          </button>
        )}
      </div>

      <div className="mb-6">
        <Tabs
          tabs={['Drafts', 'Submitted', 'Approved']}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <ExpenseTable 
        expenses={filteredExpenses}
        onEdit={handleEditClick}
        onDelete={handleDeleteExpense}
        onViewReceipt={handleViewReceipt}
      />

      {isModalOpen && (
          <AddExpenseModal
            expenseToEdit={editingExpense}
            expenseTypes={expenseTypes}
            onClose={handleModalClose}
            onExpenseAdded={handleExpenseSaved}
          />
        )}
    </div>
  );
}