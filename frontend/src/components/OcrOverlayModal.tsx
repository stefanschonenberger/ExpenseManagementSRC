// frontend/src/components/OcrOverlayModal.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, DollarSign, Calendar, Building, Percent, AlertTriangle, Loader2 } from 'lucide-react';

// Define the pdfjs-dist window object type to avoid TypeScript errors
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// --- Robust PDF.js Loader ---
// This promise ensures we only try to load the script once.
let pdfJsLoadingPromise: Promise<void> | null = null;
const loadPdfJs = () => {
  if (typeof window.pdfjsLib !== 'undefined') {
    return Promise.resolve();
  }

  if (pdfJsLoadingPromise) {
    return pdfJsLoadingPromise;
  }

  pdfJsLoadingPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    // Use a stable CDN URL for the library
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.102/pdf.min.js';
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      pdfJsLoadingPromise = null; // Reset promise on error
      reject(new Error('Failed to load pdf.js'));
    };
    document.body.appendChild(script);
  });

  return pdfJsLoadingPromise;
};


interface OcrWord {
  WordText: string;
  Left: number;
  Top: number;
  Height: number;
  Width: number;
}

interface OcrLine {
  Words: OcrWord[];
  MaxHeight: number;
  MinTop: number;
}

interface OcrOverlay {
  Lines: OcrLine[];
  HasOverlay: boolean;
  Message: string;
}

interface OcrOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: string; date: string; supplier: string; vat: string }) => void;
  scanResult?: { // Prop is now optional to prevent crashes
    overlay: OcrOverlay;
    parsedData: any;
    warning?: string | null;
  };
  imageSrc: string;
  mimeType: string;
  initialData: {
      supplier: string;
      date: string;
      amount: string;
      vat: string;
  }
}

type SelectionMode = 'supplier' | 'date' | 'amount' | 'vat';

export default function OcrOverlayModal({ isOpen, onClose, onConfirm, scanResult, imageSrc, mimeType, initialData }: OcrOverlayModalProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAmount, setSelectedAmount] = useState('');
  const [selectedVat, setSelectedVat] = useState('');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('supplier');

  const [imageDimensions, setImageDimensions] = useState({
    displayedWidth: 0,
    displayedHeight: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const warning = scanResult?.warning;
  const isPdf = mimeType === 'application/pdf';

  const calculateAndSetDimensions = useCallback((naturalWidth: number, naturalHeight: number) => {
    if (containerRef.current) {
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        const containerAspectRatio = containerWidth / containerHeight;
        const imageAspectRatio = naturalWidth / naturalHeight;
        let displayedWidth, displayedHeight;

        if (imageAspectRatio > containerAspectRatio) {
            displayedWidth = containerWidth;
            displayedHeight = containerWidth / imageAspectRatio;
        } else {
            displayedHeight = containerHeight;
            displayedWidth = containerHeight * imageAspectRatio;
        }
        const offsetX = (containerWidth - displayedWidth) / 2;
        const offsetY = (containerHeight - displayedHeight) / 2;
        setImageDimensions({ displayedWidth, displayedHeight, naturalWidth, naturalHeight, offsetX, offsetY });
    }
  }, []);

  const handleImageLoad = () => {
    if (imageRef.current) {
      calculateAndSetDimensions(imageRef.current.naturalWidth, imageRef.current.naturalHeight);
    }
  };

  // Pre-populate fields, prioritizing existing data from the parent modal
  useEffect(() => {
    // Defensively check if scanResult and its properties exist before using them.
    if (isOpen && scanResult && scanResult.parsedData) {
        const parsedData = scanResult.parsedData || {};
        setSelectedSupplier(initialData.supplier || parsedData.supplier || '');
        setSelectedDate(initialData.date || parsedData.expense_date || '');
        const initialAmount = initialData.amount ? parseFloat(initialData.amount).toFixed(2) : '';
        const parsedAmount = parsedData.amount ? (parsedData.amount / 100).toFixed(2) : '';
        setSelectedAmount(initialAmount || parsedAmount || '');
        const initialVat = initialData.vat ? parseFloat(initialData.vat).toFixed(2) : '';
        const parsedVat = parsedData.vat_amount ? (parsedData.vat_amount / 100).toFixed(2) : '';
        setSelectedVat(initialVat || parsedVat || '');
    }
  }, [isOpen, scanResult, initialData]);

  // Effect to render PDF to canvas
  useEffect(() => {
    if (!isOpen || !isPdf || !imageSrc) return;

    const renderPdfOnCanvas = async () => {
      setIsRendering(true);
      try {
        await loadPdfJs();
        
        const pdfjsLib = window.pdfjsLib;
        // Use a matching, stable CDN URL for the worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.102/pdf.worker.min.js`;

        const response = await fetch(imageSrc);
        if (!response.ok) throw new Error(`Failed to fetch PDF blob: ${response.statusText}`);
        const pdfData = await response.arrayBuffer();
        const typedarray = new Uint8Array(pdfData);

        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          calculateAndSetDimensions(canvas.width, canvas.height);
        }
      } catch (error) {
        console.error("An error occurred during the PDF rendering process:", error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPdfOnCanvas();

  }, [isOpen, isPdf, imageSrc, calculateAndSetDimensions]);

  if (!isOpen) return null;

  const handleLineClick = (line: OcrLine) => {
    const lineText = line.Words.map(w => w.WordText).join(' ').trim();
    switch (selectionMode) {
      case 'supplier': setSelectedSupplier(lineText); break;
      case 'date': setSelectedDate(lineText); break;
      case 'amount': setSelectedAmount(lineText); break;
      case 'vat': setSelectedVat(lineText); break;
    }
  };

  const handleConfirm = () => {
    onConfirm({ supplier: selectedSupplier, date: selectedDate, amount: selectedAmount, vat: selectedVat });
    onClose();
  };

  const selectionButtons: { mode: SelectionMode, icon: React.ElementType, label: string }[] = [
    { mode: 'supplier', icon: Building, label: 'Supplier' },
    { mode: 'date', icon: Calendar, label: 'Date' },
    { mode: 'amount', icon: DollarSign, label: 'Amount' },
    { mode: 'vat', icon: Percent, label: 'VAT' },
  ];

  const scaleFactor = imageDimensions.naturalWidth > 0
    ? imageDimensions.displayedWidth / imageDimensions.naturalWidth
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="flex flex-col w-full h-full max-w-7xl max-h-[90vh] p-4 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Verify Scanned Data</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><X /></button>
        </div>

        {warning && (
            <div className="flex items-start p-3 my-2 text-sm text-yellow-800 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg" role="alert">
                <AlertTriangle className="w-5 h-5 mr-3 text-yellow-600"/>
                <div>
                    <p className="font-bold">Partial Scan Warning</p>
                    <p>{warning}</p>
                </div>
            </div>
        )}

        <div className={`flex flex-grow overflow-hidden ${warning ? 'mt-2' : 'mt-4'}`}>
          <div className="flex flex-col w-1/3 pr-4 space-y-4 border-r">
            <p className="text-sm text-gray-600">Auto-populated data is shown below. Click a field, then click the receipt text to correct it.</p>
            <div className="space-y-2">
                {selectionButtons.map(({mode, icon: Icon, label}) => (
                    <button key={mode} onClick={() => setSelectionMode(mode)} className={`w-full flex items-center p-3 text-left rounded-md border-2 transition-colors ${selectionMode === mode ? 'bg-blue-100 border-primary text-primary' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                        <Icon className="w-5 h-5 mr-3"/>
                        <span className="font-medium">{label}</span>
                    </button>
                ))}
            </div>
            <div className="p-4 mt-4 space-y-3 border rounded-md bg-gray-50">
                <div>
                    <label className="text-xs font-semibold text-gray-500">SUPPLIER</label>
                    <input type="text" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full p-2 mt-1 text-sm border rounded-md"/>
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-500">DATE</label>
                    <input type="text" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 mt-1 text-sm border rounded-md"/>
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-500">AMOUNT</label>
                    <input type="text" value={selectedAmount} onChange={e => setSelectedAmount(e.target.value)} className="w-full p-2 mt-1 text-sm border rounded-md"/>
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-500">VAT</label>
                    <input type="text" value={selectedVat} onChange={e => setSelectedVat(e.target.value)} className="w-full p-2 mt-1 text-sm border rounded-md"/>
                </div>
            </div>
          </div>
          <div ref={containerRef} className="relative flex items-center justify-center flex-grow w-2/3 h-full overflow-hidden bg-gray-100">
              {isRendering && <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />}
              {isPdf ? (
                  <canvas ref={canvasRef} className="absolute object-contain" style={{ width: `${imageDimensions.displayedWidth}px`, height: `${imageDimensions.displayedHeight}px`, top: `${imageDimensions.offsetY}px`, left: `${imageDimensions.offsetX}px`, visibility: isRendering ? 'hidden' : 'visible' }} />
              ) : (
                <img ref={imageRef} src={imageSrc} alt="Scanned Receipt" onLoad={handleImageLoad} className="absolute object-contain" style={{ width: `${imageDimensions.displayedWidth}px`, height: `${imageDimensions.displayedHeight}px`, top: `${imageDimensions.offsetY}px`, left: `${imageDimensions.offsetX}px` }} />
              )}
              {scaleFactor > 0 && scanResult?.overlay?.Lines?.map((line, lineIndex) => {
                if (!line.Words || line.Words.length === 0) return null;
                const firstWord = line.Words[0];
                const lastWord = line.Words[line.Words.length - 1];
                const lineWidth = lastWord.Left + lastWord.Width - firstWord.Left;
                return (
                  <div key={lineIndex} className="absolute border border-dashed border-blue-500 cursor-pointer hover:bg-blue-500 hover:bg-opacity-30 z-10" style={{ left: `${(firstWord.Left * scaleFactor) + imageDimensions.offsetX}px`, top: `${(line.MinTop * scaleFactor) + imageDimensions.offsetY}px`, width: `${lineWidth * scaleFactor}px`, height: `${line.MaxHeight * scaleFactor}px` }} onClick={() => handleLineClick(line)} title={line.Words.map(w => w.WordText).join(' ')} />
                )
              })}
          </div>
        </div>
        <div className="flex justify-end flex-shrink-0 pt-4 mt-4 border-t">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleConfirm} type="button" className="inline-flex items-center justify-center px-4 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-hover">
            <Check className="w-4 h-4 mr-2"/>
            Confirm Selections
          </button>
        </div>
      </div>
    </div>
  );
}
