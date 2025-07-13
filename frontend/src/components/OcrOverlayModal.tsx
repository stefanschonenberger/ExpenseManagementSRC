// frontend/src/components/OcrOverlayModal.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, DollarSign, Calendar, Building, FileText } from 'lucide-react'; // FIX: Added FileText import

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
  onConfirm: (data: { total: string; date: string; supplier: string; }) => void;
  scanResult: { overlay: OcrOverlay; parsedData: any };
  imageSrc: string;
  initialSupplier: string;
  initialDate: string;
  initialTotal: string;
}

type SelectionMode = 'supplier' | 'date' | 'total';

export default function OcrOverlayModal({ isOpen, onClose, onConfirm, scanResult, imageSrc, initialSupplier, initialDate, initialTotal }: OcrOverlayModalProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTotal, setSelectedTotal] = useState('');
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedSupplier(initialSupplier || scanResult?.parsedData?.supplier || '');
      setSelectedDate(initialDate || scanResult?.parsedData?.expense_date || '');
      setSelectedTotal(initialTotal || (scanResult?.parsedData?.amount ? (scanResult.parsedData.amount / 100).toFixed(2) : ''));
    }
  }, [isOpen, initialSupplier, initialDate, initialTotal, scanResult]);


  const handleImageLoad = useCallback(() => {
    if (imageRef.current && containerRef.current) {
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        const { naturalWidth, naturalHeight } = imageRef.current;

        if (naturalWidth === 0 || naturalHeight === 0) {
            console.warn("Image natural dimensions are zero, cannot calculate overlay positions.");
            return;
        }

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
        
        if (displayedWidth === 0 || displayedHeight === 0) {
            console.warn("Calculated displayed dimensions are zero.");
            return;
        }

        const offsetX = (containerWidth - displayedWidth) / 2;
        const offsetY = (containerHeight - displayedHeight) / 2;

        setImageDimensions({ displayedWidth, displayedHeight, naturalWidth, naturalHeight, offsetX, offsetY });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleImageLoad);
    return () => window.removeEventListener('resize', handleImageLoad);
  }, [handleImageLoad]);

  useEffect(() => {
    if (isOpen && imageSrc) {
      setImageDimensions({ displayedWidth: 0, displayedHeight: 0, naturalWidth: 0, naturalHeight: 0, offsetX: 0, offsetY: 0 });
      if (imageRef.current?.complete) {
        handleImageLoad();
      }
    }
  }, [isOpen, imageSrc, handleImageLoad]);

  if (!isOpen) return null;

  const handleLineClick = (line: OcrLine) => {
    const lineText = line.Words.map(w => w.WordText).join(' ').trim();
    switch (selectionMode) {
      case 'supplier':
        setSelectedSupplier(lineText);
        break;
      case 'date':
        setSelectedDate(lineText);
        break;
      case 'total':
        setSelectedTotal(lineText);
        break;
    }
  };

  const handleConfirm = () => {
    onConfirm({
      supplier: selectedSupplier,
      date: selectedDate,
      total: selectedTotal,
    });
    onClose();
  };
  
  const selectionButtons: { mode: SelectionMode, icon: React.ElementType, label: string }[] = [
    { mode: 'supplier', icon: Building, label: 'Supplier' },
    { mode: 'date', icon: Calendar, label: 'Date' },
    { mode: 'total', icon: DollarSign, label: 'Total' },
  ];

  const overlayLines = scanResult?.overlay?.Lines || [];

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
        <div className="flex flex-grow mt-4 overflow-hidden">
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
                    <label className="text-xs font-semibold text-gray-500">TOTAL</label>
                    <input type="text" value={selectedTotal} onChange={e => setSelectedTotal(e.target.value)} className="w-full p-2 mt-1 text-sm border rounded-md"/>
                </div>
            </div>
          </div>
          <div ref={containerRef} className="relative flex-grow w-2/3 h-full overflow-hidden bg-gray-100">
              {imageSrc ? (
                <img 
                  ref={imageRef} 
                  src={imageSrc} 
                  alt="Scanned Receipt" 
                  onLoad={handleImageLoad} 
                  onError={(e) => console.error("Error loading image for OCR overlay:", e.currentTarget.src)} 
                  className="absolute object-contain" 
                  style={{ 
                    width: `${imageDimensions.displayedWidth}px`, 
                    height: `${imageDimensions.displayedHeight}px`, 
                    top: `${imageDimensions.offsetY}px`, 
                    left: `${imageDimensions.offsetX}px` 
                  }} 
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  <FileText className="w-16 h-16"/>
                  <p className="ml-2">No image to display for OCR.</p>
                </div>
              )}
              
              {scaleFactor > 0 && overlayLines.map((line: OcrLine, lineIndex: number) => {
                if (!line.Words || line.Words.length === 0) return null;
                const firstWord = line.Words[0];
                const lastWord = line.Words[line.Words.length - 1];
                const lineWidth = lastWord.Left + lastWord.Width - firstWord.Left;
                return (
                  <div key={lineIndex} 
                       className="absolute border border-dashed border-blue-500 cursor-pointer hover:bg-blue-500 hover:bg-opacity-30 z-10" 
                       style={{ 
                         left: `${(firstWord.Left * scaleFactor) + imageDimensions.offsetX}px`, 
                         top: `${(line.MinTop * scaleFactor) + imageDimensions.offsetY}px`, 
                         width: `${lineWidth * scaleFactor}px`, 
                         height: `${line.MaxHeight * scaleFactor}px` 
                       }} 
                       onClick={() => handleLineClick(line)} 
                       title={line.Words.map(w => w.WordText).join(' ')} 
                  />
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
