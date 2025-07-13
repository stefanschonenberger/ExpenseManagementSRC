// frontend/src/components/AddExpenseModal.tsx

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Paperclip, UploadCloud, RefreshCw, ScanLine, FileText } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/lib/toastStore';
import OcrOverlayModal from './OcrOverlayModal';

interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  vat_applied: boolean;
  expense_type: string;
  book: boolean;
  vat_amount: number;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onExpenseAdded: () => void;
  expenseToEdit?: Expense | null;
  expenseTypes: string[];
}

export default function AddExpenseModal({ onClose, onExpenseAdded, expenseToEdit, expenseTypes }: AddExpenseModalProps) {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayString());
  const [supplier, setSupplier] = useState('');
  const [vatApplied, setVatApplied] = useState(false);
  const [vatAmount, setVatAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [book, setBook] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBlobId, setScannedBlobId] = useState<string | null>(null);

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [receiptImageSrc, setReceiptImageSrc] = useState(''); // This will hold the URL for display

  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);
  const isEditMode = !!expenseToEdit;

  const calculateInclusiveVat = (totalAmount: string) => {
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) return '';
    const vat = total - (total / 1.15); // Assuming 15% VAT
    return vat.toFixed(2);
  };

  useEffect(() => {
    if (isEditMode && expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmount((expenseToEdit.amount / 100).toFixed(2));
      setExpenseDate(new Date(expenseToEdit.expense_date).toISOString().split('T')[0]);
      setSupplier(expenseToEdit.supplier || '');
      setVatApplied(expenseToEdit.vat_applied);
      setVatAmount(expenseToEdit.vat_applied ? (expenseToEdit.vat_amount / 100).toFixed(2) : '');
      setExpenseType(expenseToEdit.expense_type || '');
	    setBook(expenseToEdit.book || false);
    } else if (expenseTypes.length > 0) {
      setExpenseType(expenseTypes[0]);
	    setBook(false);
      setExpenseDate(getTodayString());
    }
  }, [isEditMode, expenseToEdit, expenseTypes]);

  useEffect(() => {
    if (vatApplied && amount) {
      setVatAmount(calculateInclusiveVat(amount));
    } else {
      setVatAmount('');
    }
  }, [vatApplied, amount]);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setReceiptFile(file);
      // Create an object URL for immediate local preview. This works for images and PDFs.
      setReceiptImageSrc(URL.createObjectURL(file)); 
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        // Upload the file to the backend. The backend will handle PDF-to-image conversion if needed.
        const uploadResponse = await api.post('/blob/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        setScannedBlobId(uploadResponse.data.id); // This is the ID of the uploaded blob (original file)
      } catch (err) {
        setError('Failed to upload receipt for scanning.');
        showToast('Failed to upload receipt.', 'error');
      }
    }
  };

  const handleScanReceipt = async () => {
    if (!scannedBlobId) return;
    setIsScanning(true);
    setError(null);
    try {
      showToast('Scanning receipt... this might take a moment.', 'info');
      // Call the backend's scan endpoint. It will convert PDF to image internally if necessary,
      // and return the OCR results and overlay data.
      const response = await api.post(`/blob/${scannedBlobId}/scan`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { parsedData, overlay } = response.data;
      setScanResult({ parsedData, overlay }); 

      showToast('Scan complete. Please verify the details.', 'success');
      setOverlayOpen(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to scan receipt.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOverlayConfirm = (data: { total: string; date: string; supplier: string; }) => {
    const parseDate = (dateStr: string): string | null => {
        if (!dateStr) return null;
        const match = dateStr.match(/(\d{1,2}[\s\/\-.]\d{1,2}[\s\/\-.]\d{4})/);
        if (!match || !match[0]) return null;
        
        const cleanedDateStr = match[0].replace(/\s/g, '').replace(/[\-.]/g, '/');
        const parts = cleanedDateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            const isoDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            if (!isNaN(new Date(isoDateStr).getTime())) {
                return isoDateStr;
            }
        }
        return null;
    };

    const parseCurrency = (currencyStr: string): string => {
        if (!currencyStr) return '';
        const match = currencyStr.match(/(\d[\d\s,]*\.\d{2})/);
        return match ? match[0].replace(/[\s,]/g, '') : '';
    };

    setSupplier(data.supplier);
    setTitle(data.supplier); // Often the title can be the supplier name
    
    const formattedDate = parseDate(data.date);
    if (formattedDate) {
        setExpenseDate(formattedDate);
    } else {
        showToast(`Could not parse date: "${data.date}". Please enter it manually.`, 'error');
    }

    setAmount(parseCurrency(data.total));
    
    // The OCR.space parsedData might also include VAT, but the current `onConfirm` signature
    // only passes total, date, and supplier. If VAT is needed, it would need to be added here.
    // For now, we'll rely on the existing VAT calculation if `vatApplied` is true.
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      const payload: any = {
        title,
        supplier,
        amount: Math.round(parseFloat(amount) * 100),
        expense_date: expenseDate,
		    book: book,
        vat_applied: vatApplied,
        expense_type: expenseType,
        currency_code: 'ZAR', // Hardcoded for now, could be dynamic
        receipt_blob_id: scannedBlobId, // This is the ID of the original uploaded file
      };

      if (vatApplied) {
        payload.vat_amount = Math.round(parseFloat(vatAmount) * 100);
      }

      if (isEditMode) {
        await api.patch(`/expense/${expenseToEdit.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post('/expense', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      onExpenseAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} expense.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
        <div className="flex w-full max-w-7xl p-6 space-x-6 bg-white rounded-lg shadow-xl" style={{height: '90vh'}}>
          
          <div className="flex flex-col w-1/3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-grow mt-4 space-y-4 overflow-y-auto pr-2">
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
                    <input type="text" id="amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">Expense Date</label>
                    <input type="date" id="expenseDate" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required max={getTodayString()} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                </div>
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
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e.target.files)} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      {receiptFile ? <p className="flex items-center justify-center text-sm text-gray-500"><Paperclip className="w-4 h-4 mr-1"/>{receiptFile.name}</p> : <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>}
                    </div>
                  </div>
                </div>
              )}
              
               <div>
                <label htmlFor="expenseType" className="block text-sm font-medium text-gray-700">Expense Type</label>
                <select id="expenseType" value={expenseType} onChange={(e) => setExpenseType(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                  {expenseTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
              <div className="flex items-center">
                  <input id="vat_applied" name="vat_applied" type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                  <label htmlFor="vat_applied" className="block ml-2 text-sm text-gray-900">VAT Applied</label>
              </div>
              {vatApplied && (
                  <div>
                      <label htmlFor="vatAmount" className="block text-sm font-medium text-gray-700">VAT Amount</label>
                      <div className="flex items-center mt-1">
                          <input type="text" id="vatAmount" value={vatAmount} onChange={(e) => setVatAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-primary focus:border-primary" />
                          <button type="button" onClick={() => setVatAmount(calculateInclusiveVat(amount))} title="Recalculate VAT" className="px-3 py-2 text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200">
                              <RefreshCw className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
              )}
                <div className="flex items-center">
                  <input id="book_expense" name="book_expense" type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                  <label htmlFor="book_expense" className="block ml-2 text-sm text-gray-900">Book</label>
              </div>

              {error && <p className="text-sm text-center text-danger">{error}</p>}
              <div className="flex justify-end pt-4 mt-auto space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover disabled:bg-gray-400">
                    {isUploading ? 'Saving...' : `Save ${isEditMode ? 'Changes' : 'Expense'}`}
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col w-2/3 pl-6 border-l">
            <h3 className="text-lg font-semibold text-gray-800">Receipt Preview</h3>
            <div className="relative flex-grow mt-2 bg-gray-100 rounded-lg">
              {receiptFile && receiptImageSrc ? (
                // Always display as an image, as the OCR overlay expects an image.
                // If the original file was a PDF, receiptImageSrc will be a blob URL of the PDF.
                // The OCR overlay will work on the image data returned by the backend's scan endpoint.
                <img src={receiptImageSrc} alt="Receipt Preview" className="absolute top-0 left-0 object-contain w-full h-full rounded-md"/>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  <FileText className="w-16 h-16"/>
                </div>
              )}
            </div>
            {scannedBlobId && (
              <button type="button" onClick={handleScanReceipt} disabled={isScanning} className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                <ScanLine className="w-5 h-5 mr-2 -ml-1" />
                {isScanning ? 'Scanning...' : 'Verify Scanned Data'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isOverlayOpen && scanResult && (
        <OcrOverlayModal
          isOpen={isOverlayOpen}
          onClose={() => setOverlayOpen(false)}
          onConfirm={handleOverlayConfirm}
          scanResult={scanResult}
          // The imageSrc passed to OcrOverlayModal MUST be an image URL.
          // If the original file was a PDF, receiptImageSrc will be a blob URL of the PDF.
          // For the OCR overlay to correctly align, it needs the *rendered image* of the PDF.
          // A more robust solution would be for the backend's `/blob/:id/scan` endpoint
          // to return the URL of the *converted image* if the input was a PDF, and you'd use that here.
          // For simplicity with the current setup, we're relying on `receiptImageSrc`
          // which is a blob URL of the *original* file. If it's a PDF, the `OcrOverlayModal`
          // will display it as an image, which might not be ideal, but the OCR overlay
          // will still align based on the OCR.space-processed image.
          imageSrc={receiptImageSrc} 
        />
      )}
    </>
  );
}
