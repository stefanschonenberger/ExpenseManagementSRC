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
  receipt_blob_id: string | null; // Ensure this is part of the interface
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
  const [scanResult, setScanResult] = useState<{ parsedData: any; overlay: any; ocrImageBlobId: string } | null>(null);
  const [receiptImageSrc, setReceiptImageSrc] = useState(''); // For initial preview in this modal
  const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null); // To store the fetched mimetype
  const [ocrOverlayImageSrc, setOcrOverlayImageSrc] = useState(''); // For the OcrOverlayModal

  // FIX: New state variables to remember last confirmed OCR overlay selections (raw strings)
  const [rememberedOcrSupplier, setRememberedOcrSupplier] = useState('');
  const [rememberedOcrDate, setRememberedOcrDate] = useState('');
  const [rememberedOcrTotal, setRememberedOcrTotal] = useState('');


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
    const loadExistingReceipt = async () => {
      if (isEditMode && expenseToEdit?.receipt_blob_id) {
        setScannedBlobId(expenseToEdit.receipt_blob_id);
        const existingReceiptUrl = `${api.defaults.baseURL}/blob/${expenseToEdit.receipt_blob_id}`;
        setReceiptImageSrc(existingReceiptUrl);

        try {
          // Fetch the head of the blob to get its mimetype without downloading the whole file
          const response = await api.head(existingReceiptUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const mime = response.headers['content-type'];
          setReceiptMimeType(mime || null);
          console.log(`Fetched existing receipt mimetype: ${mime}`);

          // If the existing receipt is an image, it can also serve as the OCR overlay image initially.
          // If it's a PDF, the OCR overlay image will only be available after a scan.
          if (mime && mime.startsWith('image/')) {
            setOcrOverlayImageSrc(existingReceiptUrl);
          } else {
            setOcrOverlayImageSrc(''); // Clear if it's a PDF or unknown type
          }

        } catch (err) {
          console.error("Failed to fetch existing receipt mimetype:", err);
          setReceiptMimeType(null);
          setReceiptImageSrc(''); // Clear preview if fetching fails
          setOcrOverlayImageSrc('');
          showToast('Failed to load existing receipt preview.', 'error');
        }
      } else if (isEditMode && !expenseToEdit?.receipt_blob_id) {
        // If editing an expense that has no receipt
        setReceiptFile(null);
        setReceiptImageSrc('');
        setReceiptMimeType(null);
        setOcrOverlayImageSrc('');
        setScannedBlobId(null);
      }
    };

    if (isEditMode && expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmount((expenseToEdit.amount / 100).toFixed(2));
      setExpenseDate(new Date(expenseToEdit.expense_date).toISOString().split('T')[0]);
      setSupplier(expenseToEdit.supplier || '');
      setVatApplied(expenseToEdit.vat_applied);
      setVatAmount(expenseToEdit.vat_applied ? (expenseToEdit.vat_amount / 100).toFixed(2) : '');
      setExpenseType(expenseToEdit.expense_type || '');
	    setBook(expenseToEdit.book || false);
      loadExistingReceipt(); // Call the async function
    } else if (!isEditMode && expenseTypes.length > 0) {
      setExpenseType(expenseTypes[0]);
	    setBook(false);
      setExpenseDate(getTodayString());
      // Clear receipt states when adding a new expense
      setReceiptFile(null);
      setReceiptImageSrc('');
      setReceiptMimeType(null);
      setOcrOverlayImageSrc('');
      setScannedBlobId(null);
    }
    // FIX: Initialize remembered OCR values from the expenseToEdit's data if available
    // This ensures that when editing, the OCR overlay starts with the expense's current data
    setRememberedOcrSupplier(expenseToEdit?.supplier || '');
    setRememberedOcrDate(expenseToEdit?.expense_date ? new Date(expenseToEdit.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ') : ''); // Convert to "DD Mon YYYY" format
    setRememberedOcrTotal(expenseToEdit?.amount ? (expenseToEdit.amount / 100).toFixed(2) : '');

  }, [isEditMode, expenseToEdit, expenseTypes, token]); // Add token to dependencies

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
      setReceiptMimeType(file.type); // Set mimetype from the new file
      // Create an object URL for immediate local preview in THIS modal.
      setReceiptImageSrc(URL.createObjectURL(file)); 
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        // Upload the file to the backend. The backend will handle PDF-to-image conversion if needed.
        const uploadResponse = await api.post('/blob/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        setScannedBlobId(uploadResponse.data.id); // This is the ID of the newly uploaded blob
        // If a new file is uploaded, clear the OCR overlay image source until scanned
        setOcrOverlayImageSrc(''); 
        // FIX: Clear remembered OCR selections when a new file is uploaded
        setRememberedOcrSupplier('');
        setRememberedOcrDate('');
        setRememberedOcrTotal('');

      } catch (err) {
        setError('Failed to upload receipt for scanning.');
        showToast('Failed to upload receipt.', 'error');
      }
    }
  };

  const handleScanReceipt = async () => {
    if (!scannedBlobId) {
      showToast('No receipt attached to scan.', 'info');
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      showToast('Scanning receipt... this might take a moment.', 'info');
      // Call the backend's scan endpoint. It will convert PDF to image internally if necessary,
      // and return the OCR results and overlay data, including the ocrImageBlobId.
      const response = await api.post(`/blob/${scannedBlobId}/scan`, undefined, { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'json' // Ensure response is parsed as JSON
      });
      
      // FIX: Ensure ocrImageBlobId is present in the response
      if (response.data && response.data.parsedData && response.data.overlay && response.data.ocrImageBlobId) {
        const { parsedData, overlay, ocrImageBlobId } = response.data;
        
        // Construct the full URL to fetch the OCR'd image from the backend
        const constructedOcrImageUrl = `${api.defaults.baseURL}/blob/${ocrImageBlobId}`;
        console.log("OCR Overlay Image URL being passed:", constructedOcrImageUrl); // Debugging log

        // Set the state for the OcrOverlayModal's image source
        setOcrOverlayImageSrc(constructedOcrImageUrl);
        setScanResult({ parsedData, overlay, ocrImageBlobId }); 

        // FIX: When a new scan is performed, update the remembered OCR values with the new parsed data
        setRememberedOcrSupplier(parsedData.supplier || '');
        setRememberedOcrDate(parsedData.expense_date || ''); // Keep ISO format from OCR service
        setRememberedOcrTotal(parsedData.amount ? (parsedData.amount / 100).toFixed(2) : '');

        showToast('Scan complete. Please verify the details.', 'success');
        setOverlayOpen(true);
      } else {
        // Handle cases where the backend response is not as expected
        const errorMessage = response.data?.message || 'OCR scan returned incomplete data. Please try again or enter manually.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to scan receipt.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOverlayConfirm = (data: { total: string; date: string; supplier: string; }) => {
    // FIX: Enhance parseDate to handle "DD Mon YYYY" format
    const parseDate = (dateStr: string): string | null => {
        if (!dateStr) return null;

        // Try YYYY-MM-DD format first (from backend's OCR initial parse)
        const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
        if (isoMatch) {
            return dateStr;
        }

        // Try DD Mon YYYY format (e.g., "09 Jul 2025")
        const monthMap: { [key: string]: string } = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const ddMonYyyyMatch = dateStr.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
        if (ddMonYyyyMatch) {
            const day = ddMonYyyyMatch[1].padStart(2, '0');
            const month = monthMap[ddMonYyyyMatch[2]];
            const year = ddMonYyyyMatch[3];
            if (day && month && year) {
                return `${year}-${month}-${day}`; // Convert to ISO for input type="date"
            }
        }

        // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY format
        const ddMmYyyyMatch = dateStr.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})$/);
        if (ddMmYyyyMatch) {
            const day = ddMmYyyyMatch[1].padStart(2, '0');
            const month = ddMmYyyyMatch[2].padStart(2, '0');
            const year = ddMmYyyyMatch[3];
            return `${year}-${month}-${day}`; // Convert to ISO for input type="date"
        }

        // Fallback: try to parse as a generic date and convert to ISO
        try {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString().split('T')[0];
            }
        } catch (e) {
            // Ignore parsing errors
        }

        return null; // If no format matches
    };

    const parseCurrency = (currencyStr: string): string => {
        if (!currencyStr) return '';
        const match = currencyStr.match(/(\d[\d\s,]*\.\d{2})/);
        return match ? match[0].replace(/[\s,]/g, '') : '';
    };

    // FIX: Update AddExpenseModal's state with confirmed OCR values
    // These are the actual form fields, so they should reflect user selections
    setSupplier(data.supplier);
    setTitle(data.supplier); // Often the title can be the supplier name
    
    const formattedDate = parseDate(data.date);
    if (formattedDate) {
        setExpenseDate(formattedDate);
    } else {
        showToast(`Could not parse date: "${data.date}". Please enter it manually.`, 'error');
    }

    setAmount(parseCurrency(data.total));

    // FIX: Store these confirmed values in new state variables (raw strings)
    setRememberedOcrSupplier(data.supplier);
    setRememberedOcrDate(data.date); 
    setRememberedOcrTotal(data.total); 
    
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
        <div className="relative w-full max-w-7xl p-6 space-x-6 bg-white rounded-lg shadow-xl" style={{height: '90vh'}}>
          {/* FIX: Move close button to top right of the modal content */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 rounded-full hover:bg-gray-100 z-10"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col w-1/3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h2>
              {/* The close button is now outside this div */}
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
              
              {/* FIX: Always show the receipt upload/preview section */}
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
                    {/* Display current receipt file name if a new one is selected, otherwise show existing */}
                    {receiptFile ? <p className="flex items-center justify-center text-sm text-gray-500"><Paperclip className="w-4 h-4 mr-1"/>{receiptFile.name}</p> : 
                     (expenseToEdit?.receipt_blob_id && <p className="flex items-center justify-center text-sm text-gray-500"><Paperclip className="w-4 h-4 mr-1"/>Existing Receipt</p>)}
                  </div>
                </div>
              </div>
              
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
              {/* Display preview based on receiptImageSrc and receiptMimeType */}
              {(receiptImageSrc && receiptMimeType) ? (
                receiptMimeType.startsWith('image/') ? (
                  <img src={receiptImageSrc} alt="Receipt Preview" className="absolute top-0 left-0 object-contain w-full h-full rounded-md"/>
                ) : receiptMimeType === 'application/pdf' ? (
                  <embed src={receiptImageSrc} type="application/pdf" className="w-full h-full rounded-md"/>
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-center text-gray-600">
                    <p>Unsupported file type for preview: {receiptMimeType}.</p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  <FileText className="w-16 h-16"/>
                  <p className="ml-2">No receipt attached.</p>
                </div>
              )}
            </div>
            {/* Only show scan button if a blob ID is available */}
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
          // Pass the ocrOverlayImageSrc state to the OcrOverlayModal
          imageSrc={ocrOverlayImageSrc} 
          // FIX: Pass last confirmed OCR values to OcrOverlayModal
          initialSupplier={rememberedOcrSupplier}
          initialDate={rememberedOcrDate}
          initialTotal={rememberedOcrTotal}
        />
      )}
    </>
  );
}
