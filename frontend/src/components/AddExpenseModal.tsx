// src/components/AddExpenseModal.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Paperclip, UploadCloud } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  vat_applied: boolean;
  expense_type: string;
  book: boolean;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onExpenseAdded: () => void;
  expenseToEdit?: Expense | null;
  expenseTypes: string[];
}

export default function AddExpenseModal({ onClose, onExpenseAdded, expenseToEdit, expenseTypes }: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [vatApplied, setVatApplied] = useState(false);
  const [expenseType, setExpenseType] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [book, setBook] = useState(false); // New state for the checkbox

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const token = useAuthStore((state) => state.token);
  const isEditMode = !!expenseToEdit;

  useEffect(() => {
    if (isEditMode) {
      setTitle(expenseToEdit.title);
      setAmount((expenseToEdit.amount / 100).toFixed(2));
      setExpenseDate(new Date(expenseToEdit.expense_date).toISOString().split('T')[0]);
      setSupplier(expenseToEdit.supplier || '');
      setVatApplied(expenseToEdit.vat_applied);
      setExpenseType(expenseToEdit.expense_type || '');
	  setBook(expenseToEdit.book || false); // Pre-fill the new checkbox
    } else if (expenseTypes.length > 0) {
      setExpenseType(expenseTypes[0]);
	  setBook(false);
    }
  }, [isEditMode, expenseToEdit, expenseTypes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { setReceiptFile(e.target.files[0]); }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) { setReceiptFile(e.dataTransfer.files[0]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      const payload = {
        title,
        supplier,
        amount: Math.round(parseFloat(amount) * 100),
        expense_date: expenseDate,
		book: book,
        vat_applied: vatApplied,
        expense_type: expenseType,
        currency_code: 'ZAR',
      };

      if (isEditMode) {
        await api.patch(`/expense/${expenseToEdit.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        let receiptBlobId: string | null = null;
        if (receiptFile) {
          const formData = new FormData();
          formData.append('file', receiptFile);
          const uploadResponse = await api.post('/blob/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
          });
          receiptBlobId = uploadResponse.data.id;
        }
        await api.post('/expense', {...payload, receipt_blob_id: receiptBlobId}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      onExpenseAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} expense.`);
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
              </div>
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Supplier / Vendor</label>
                <input type="text" id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                  <input type="number" step="0.01" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
              </div>
              <div>
                  <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">Expense Date</label>
                  <input type="date" id="expenseDate" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
              </div>
            </div>
            <div>
              <label htmlFor="expenseType" className="block text-sm font-medium text-gray-700">Expense Type</label>
              <select
                id="expenseType"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                {expenseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
                <input id="vat_applied" name="vat_applied" type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                <label htmlFor="vat_applied" className="block ml-2 text-sm text-gray-900">VAT Applied</label>
            </div>
			<div className="flex items-center">
                <input id="book_expense" name="book_expense" type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                <label htmlFor="book_expense" className="block ml-2 text-sm text-gray-900">Book</label>
            </div>
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Attach Receipt</label>
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-primary bg-blue-50' : 'border-gray-300'}`}>
                  <div className="space-y-1 text-center">
                    <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative font-medium rounded-md cursor-pointer text-primary hover:text-primary-hover">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {receiptFile ? <p className="flex items-center justify-center text-sm text-gray-500"><Paperclip className="w-4 h-4 mr-1"/>{receiptFile.name}</p> : <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>}
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-center text-danger">{error}</p>}
            <div className="flex justify-end pt-4 space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isUploading} className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400">
                  {isUploading ? 'Saving...' : `Save ${isEditMode ? 'Changes' : 'Expense'}`}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}